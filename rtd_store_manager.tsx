import { useState, useEffect, useMemo } from "react";

// ── Helpers ──────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const pad = n => String(n).padStart(4, "0");

function useLS(key, init) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

const toCSV = (rows, cols) => {
  const hdr = cols.map(c => c.label).join(",");
  const body = rows.map(r => cols.map(c => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  return hdr + "\n" + body;
};
const dlCSV = (name, csv) => {
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = name; a.click();
};

// ── Default Data ─────────────────────────────────────────
const DEF_SKUS = ["Acrylic Marker Set","Watercolour Set","Sketch Pad A4","Canvas 12x16","Oil Paint Kit","Brush Set (12pc)","Palette Knife Set","Easel Foldable","Charcoal Sticks","Pastel Crayons","Ink Bottle Black","Spray Fixative","Linseed Oil","Turpentine 500ml","Gesso Primer"];
const DEF_CHANNELS = ["Amazon","Flipkart","Blinkit","Website","Wholesale","Other"];
const DEF_BOX_SIZES = ["Small","Medium","Large","XL","Custom"];

// ── Pill ─────────────────────────────────────────────────
const Pill = ({ children, color = "blue" }) => {
  const map = { blue:"bg-blue-100 text-blue-700", green:"bg-green-100 text-green-700", orange:"bg-orange-100 text-orange-700", red:"bg-red-100 text-red-700", purple:"bg-purple-100 text-purple-700", gray:"bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color]||map.gray}`}>{children}</span>;
};

const chColor = ch => ({ Amazon:"orange", Flipkart:"blue", Blinkit:"green", Website:"purple", Wholesale:"gray", Other:"gray" }[ch] || "gray");

// ── Modal ─────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ── Confirm Modal ─────────────────────────────────────────
const Confirm = ({ open, msg, onYes, onNo }) => (
  <Modal open={open} onClose={onNo} title="Confirm">
    <p className="text-gray-600 mb-6">{msg}</p>
    <div className="flex gap-3 justify-end">
      <button onClick={onNo} className="px-4 py-2 rounded-lg border text-sm font-semibold">No</button>
      <button onClick={onYes} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">Yes</button>
    </div>
  </Modal>
);

// ── Field ──────────────────────────────────────────────────
const Field = ({ label, children, req }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}{req && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);
const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white";
const sel = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white";

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [entries, setEntries] = useLS("rtd_entries", []);
  const [rtd, setRtd] = useLS("rtd_store", []);
  const [history, setHistory] = useLS("rtd_history", []);
  const [skus, setSkus] = useLS("rtd_skus", DEF_SKUS);
  const [settings, setSettings] = useLS("rtd_settings", { prefix: "BOX", startNum: 1, channels: DEF_CHANNELS, boxSizes: DEF_BOX_SIZES });
  const [boxCounter, setBoxCounter] = useLS("rtd_boxctr", 1);
  const [toast, setToast] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const nextBox = () => `${settings.prefix}-${pad(boxCounter)}`;

  const saveEntry = (form) => {
    const boxNum = nextBox();
    const rec = { ...form, id: genId(), boxNumber: boxNum, status: "Stored", createdAt: new Date().toISOString() };
    setEntries(p => [rec, ...p]);
    setBoxCounter(n => n + 1);
    if (form.storeInRTD === "Yes") setRtd(p => [rec, ...p]);
    showToast(`Saved! Box ${boxNum} assigned.`);
    return rec;
  };

  const sendRTD = (id) => {
    const item = rtd.find(r => r.id === id);
    if (!item) return;
    setRtd(p => p.filter(r => r.id !== id));
    setHistory(p => [{ ...item, status: "Sent", sentDate: today() }, ...p]);
    showToast(`${item.productName} marked as Sent.`);
  };

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "entry", icon: "＋", label: "Packaging Entry" },
    { id: "rtdstore", icon: "📦", label: "RTD Store" },
    { id: "dispatch", icon: "↗", label: "Dispatch History" },
    { id: "skumgmt", icon: "☰", label: "SKU Management" },
    { id: "settings2", icon: "⚙", label: "Settings" },
  ];

  const goTo = (p) => { setPage(p); setSideOpen(false); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen py-6 px-3 fixed top-0 left-0 z-30">
        <div className="px-3 mb-8">
          <div className="font-black text-lg text-indigo-600">📦 RTD Manager</div>
          <div className="text-xs text-gray-400 mt-0.5">Store & Dispatch</div>
        </div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => goTo(n.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all ${page === n.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}>
            <span className="text-base">{n.icon}</span>{n.label}
          </button>
        ))}
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSideOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-2xl transform transition-transform md:hidden ${sideOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-5 border-b flex items-center justify-between">
          <div className="font-black text-indigo-600">📦 RTD Manager</div>
          <button onClick={() => setSideOpen(false)} className="text-gray-400 text-xl">×</button>
        </div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => goTo(n.id)}
            className={`flex items-center gap-3 px-5 py-3 w-full text-sm font-medium ${page === n.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600"}`}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 flex flex-col pb-20 md:pb-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button className="md:hidden p-1.5 rounded-lg text-gray-500" onClick={() => setSideOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="font-bold text-gray-800">{navItems.find(n => n.id === page)?.label || "RTD Manager"}</div>
          <div className="ml-auto text-xs text-gray-400">{fmtDate(today())}</div>
        </header>

        <div className="flex-1 p-4">
          {page === "dashboard"  && <Dashboard entries={entries} rtd={rtd} history={history} boxCounter={boxCounter} settings={settings} goTo={goTo} />}
          {page === "entry"      && <PackagingEntry skus={skus} settings={settings} nextBox={nextBox} onSave={saveEntry} />}
          {page === "rtdstore"   && <RTDStore rtd={rtd} onSend={sendRTD} settings={settings} />}
          {page === "dispatch"   && <DispatchHistory history={history} />}
          {page === "skumgmt"    && <SKUMgmt skus={skus} setSkus={setSkus} showToast={showToast} />}
          {page === "settings2"  && <Settings settings={settings} setSettings={setSettings} boxCounter={boxCounter} setBoxCounter={setBoxCounter} showToast={showToast} />}
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex md:hidden z-30">
        {navItems.slice(0,5).map(n => (
          <button key={n.id} onClick={() => goTo(n.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${page === n.id ? "text-indigo-600" : "text-gray-400"}`}>
            <span className="text-lg leading-none mb-0.5">{n.icon}</span>
            <span className="text-[10px] leading-none">{n.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === "error" ? "bg-red-500" : "bg-green-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ entries, rtd, history, boxCounter, settings, goTo }) {
  const todayStr = today();
  const todayEntries = entries.filter(e => e.date === todayStr).length;
  const sentToday = history.filter(h => h.sentDate === todayStr).length;
  const lastBox = boxCounter > 1 ? `${settings.prefix}-${pad(boxCounter - 1)}` : "—";

  const cards = [
    { label: "Packaging Today", value: todayEntries, color: "bg-indigo-50 text-indigo-700", icon: "📋" },
    { label: "RTD Items", value: rtd.length, color: "bg-orange-50 text-orange-700", icon: "📦" },
    { label: "Sent Today", value: sentToday, color: "bg-green-50 text-green-700", icon: "✅" },
    { label: "Last Box No.", value: lastBox, color: "bg-purple-50 text-purple-700", icon: "🏷" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-black">{c.value}</div>
            <div className="text-xs font-semibold opacity-70 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="font-bold text-sm text-gray-700 mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => goTo("entry")} className="bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold">+ New Entry</button>
          <button onClick={() => goTo("rtdstore")} className="bg-orange-50 text-orange-700 border border-orange-200 rounded-xl py-3 text-sm font-semibold">View RTD Store</button>
        </div>
      </div>

      {/* Recent RTD */}
      {rtd.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="font-bold text-sm text-gray-700 mb-3">Recent RTD Items</div>
          <div className="space-y-2">
            {rtd.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{r.productName}</div>
                  <div className="text-xs text-gray-400">{r.boxNumber} · {r.boxSize}</div>
                </div>
                <Pill color={chColor(r.channel)}>{r.channel}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// PACKAGING ENTRY
// ═══════════════════════════════════════════
function PackagingEntry({ skus, settings, nextBox, onSave }) {
  const blank = { date: today(), channel: settings.channels[0] || "Amazon", productName: "", quantity: "", storeInRTD: "Yes", boxSize: settings.boxSizes[0] || "Medium", notes: "" };
  const [form, setForm] = useState(blank);
  const [skuSearch, setSkuSearch] = useState("");
  const [showSkuDrop, setShowSkuDrop] = useState(false);
  const [saved, setSaved] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredSkus = useMemo(() => skus.filter(s => s.toLowerCase().includes(skuSearch.toLowerCase())), [skus, skuSearch]);

  const handleSubmit = () => {
    if (!form.productName || !form.quantity) return alert("Product name and quantity are required.");
    const rec = onSave(form);
    setSaved(rec);
    setForm({ ...blank, date: form.date });
    setSkuSearch("");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-semibold">
          ✅ Saved! Box Number: <span className="font-black">{saved.boxNumber}</span>
          {saved.storeInRTD === "Yes" && " · Added to RTD Store"}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-800">New Packaging Entry</div>
          <div className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg">Next: {nextBox()}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" req><input type="date" className={inp} value={form.date} onChange={e => set("date", e.target.value)} /></Field>
          <Field label="Channel" req>
            <select className={sel} value={form.channel} onChange={e => set("channel", e.target.value)}>
              {settings.channels.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Product Name" req>
          <div className="relative">
            <input className={inp} placeholder="Search SKU…" value={skuSearch || form.productName}
              onChange={e => { setSkuSearch(e.target.value); set("productName", ""); setShowSkuDrop(true); }}
              onFocus={() => setShowSkuDrop(true)}
            />
            {showSkuDrop && filteredSkus.length > 0 && (
              <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredSkus.map(s => (
                  <button key={s} className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 font-medium"
                    onMouseDown={() => { set("productName", s); setSkuSearch(s); setShowSkuDrop(false); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" req><input type="number" min="1" className={inp} placeholder="0" value={form.quantity} onChange={e => set("quantity", e.target.value)} /></Field>
          <Field label="Store in RTD?">
            <select className={sel} value={form.storeInRTD} onChange={e => set("storeInRTD", e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Box Size">
            <select className={sel} value={form.boxSize} onChange={e => set("boxSize", e.target.value)}>
              {settings.boxSizes.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Box Number (Auto)">
            <input className={`${inp} bg-gray-50 text-gray-500`} value={nextBox()} readOnly />
          </Field>
        </div>

        <Field label="Notes (Optional)">
          <textarea className={inp} rows={2} placeholder="Any notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
        </Field>

        <button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Save Entry
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// RTD STORE
// ═══════════════════════════════════════════
function RTDStore({ rtd, onSend, settings }) {
  const [q, setQ] = useState("");
  const [chF, setChF] = useState("All");
  const [dateF, setDateF] = useState("");
  const [confirm, setConfirm] = useState(null);

  const rows = useMemo(() => rtd.filter(r =>
    (q ? r.productName.toLowerCase().includes(q.toLowerCase()) || r.boxNumber.includes(q) : true) &&
    (chF !== "All" ? r.channel === chF : true) &&
    (dateF ? r.date === dateF : true)
  ), [rtd, q, chF, dateF]);

  return (
    <div className="space-y-4">
      <Confirm open={!!confirm} msg={`Mark "${confirm?.productName}" as Sent and remove from RTD Store?`}
        onYes={() => { onSend(confirm.id); setConfirm(null); }} onNo={() => setConfirm(null)} />

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-2">
        <input className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Search product / box…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white" value={chF} onChange={e => setChF(e.target.value)}>
          <option>All</option>{settings.channels.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="date" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" value={dateF} onChange={e => setDateF(e.target.value)} />
        {(q || chF !== "All" || dateF) && <button onClick={() => {setQ(""); setChF("All"); setDateF("");}} className="text-xs text-indigo-600 font-semibold px-2">Clear</button>}
      </div>

      <div className="text-sm text-gray-500 font-medium">{rows.length} item{rows.length !== 1 ? "s" : ""} in RTD Store</div>

      {rows.length === 0
        ? <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">No items in RTD Store</div>
        : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["Date","Channel","Product","Qty","Box Size","Box No.","Status","Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3"><Pill color={chColor(r.channel)}>{r.channel}</Pill></td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.quantity}</td>
                      <td className="px-4 py-3 text-gray-500">{r.boxSize}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{r.boxNumber}</td>
                      <td className="px-4 py-3"><Pill color="green">Stored</Pill></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setConfirm(r)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Send</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {rows.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-800">{r.productName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(r.date)}</div>
                    </div>
                    <Pill color={chColor(r.channel)}>{r.channel}</Pill>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">Qty: {r.quantity}</span>
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{r.boxSize}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg font-mono">{r.boxNumber}</span>
                  </div>
                  <button onClick={() => setConfirm(r)} className="w-full bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl">Send →</button>
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DISPATCH HISTORY
// ═══════════════════════════════════════════
function DispatchHistory({ history }) {
  const [q, setQ] = useState("");
  const [chF, setChF] = useState("All");
  const [dateF, setDateF] = useState("");
  const channels = [...new Set(history.map(h => h.channel))];

  const rows = useMemo(() => history.filter(r =>
    (q ? r.productName.toLowerCase().includes(q.toLowerCase()) || r.boxNumber.includes(q) : true) &&
    (chF !== "All" ? r.channel === chF : true) &&
    (dateF ? r.sentDate === dateF : true)
  ), [history, q, chF, dateF]);

  const exportData = () => {
    const cols = [
      { key: "date", label: "Date" }, { key: "channel", label: "Channel" },
      { key: "productName", label: "Product" }, { key: "quantity", label: "Qty" },
      { key: "boxNumber", label: "Box Number" }, { key: "sentDate", label: "Sent Date" },
    ];
    dlCSV("dispatch_history.csv", toCSV(rows, cols));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-2">
        <input className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white" value={chF} onChange={e => setChF(e.target.value)}>
          <option>All</option>{channels.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="date" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" value={dateF} onChange={e => setDateF(e.target.value)} />
        <button onClick={exportData} className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg">↓ CSV</button>
      </div>

      <div className="text-sm text-gray-500 font-medium">{rows.length} records</div>

      {rows.length === 0
        ? <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">No dispatch history</div>
        : (
          <>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>{["Date","Channel","Product","Qty","Box No.","Sent Date"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3"><Pill color={chColor(r.channel)}>{r.channel}</Pill></td>
                      <td className="px-4 py-3 font-semibold">{r.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.quantity}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{r.boxNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.sentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {rows.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div><div className="font-bold text-gray-800">{r.productName}</div><div className="text-xs text-gray-400">{fmtDate(r.date)}</div></div>
                    <Pill color={chColor(r.channel)}>{r.channel}</Pill>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">Qty: {r.quantity}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg font-mono">{r.boxNumber}</span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">Sent: {fmtDate(r.sentDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════
// SKU MANAGEMENT
// ═══════════════════════════════════════════
function SKUMgmt({ skus, setSkus, showToast }) {
  const [q, setQ] = useState("");
  const [newSku, setNewSku] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => skus.map((s, i) => ({ s, i })).filter(({ s }) => s.toLowerCase().includes(q.toLowerCase())), [skus, q]);

  const add = () => {
    const v = newSku.trim();
    if (!v) return;
    if (skus.includes(v)) { showToast("SKU already exists", "error"); return; }
    setSkus(p => [...p, v].sort());
    setNewSku("");
    showToast("SKU added.");
  };

  const save = (i) => {
    const v = editVal.trim();
    if (!v) return;
    setSkus(p => { const n = [...p]; n[i] = v; return n.sort(); });
    setEditIdx(null); showToast("SKU updated.");
  };

  const del = (i) => { setSkus(p => p.filter((_, j) => j !== i)); setConfirm(null); showToast("SKU deleted."); };

  const importCSV = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
      const toAdd = lines.flatMap(l => l.split(",")).map(s => s.replace(/"/g,"").trim()).filter(Boolean);
      setSkus(p => [...new Set([...p, ...toAdd])].sort());
      showToast(`Imported ${toAdd.length} SKUs.`);
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Confirm open={!!confirm} msg={`Delete SKU "${confirm?.s}"?`} onYes={() => del(confirm.i)} onNo={() => setConfirm(null)} />

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="font-bold text-gray-800">Add New SKU</div>
        <div className="flex gap-2">
          <input className={`${inp} flex-1`} placeholder="Product name…" value={newSku} onChange={e => setNewSku(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button onClick={add} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600">
            <span>📂 Import CSV</span>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={importCSV} />
          </label>
          <span className="text-xs text-gray-400">One SKU per line or comma-separated</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-800">SKU List <span className="text-gray-400 font-normal text-sm">({skus.length})</span></div>
        </div>
        <input className={inp} placeholder="Search SKUs…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No SKUs found</div>}
          {filtered.map(({ s, i }) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50">
              {editIdx === i
                ? <>
                    <input className={`${inp} flex-1`} value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save(i)} autoFocus />
                    <button onClick={() => save(i)} className="text-xs bg-green-500 text-white px-2.5 py-1.5 rounded-lg font-bold">Save</button>
                    <button onClick={() => setEditIdx(null)} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1.5 rounded-lg">Cancel</button>
                  </>
                : <>
                    <span className="flex-1 text-sm text-gray-700">{s}</span>
                    <button onClick={() => { setEditIdx(i); setEditVal(s); }} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1.5 rounded-lg">Edit</button>
                    <button onClick={() => setConfirm({ s, i })} className="text-xs bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg">Del</button>
                  </>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function Settings({ settings, setSettings, boxCounter, setBoxCounter, showToast }) {
  const [form, setForm] = useState({ ...settings });
  const [newCh, setNewCh] = useState("");
  const [newBs, setNewBs] = useState("");

  const save = () => { setSettings(form); showToast("Settings saved."); };
  const addCh = () => { if (!newCh.trim()) return; setForm(f => ({ ...f, channels: [...f.channels, newCh.trim()] })); setNewCh(""); };
  const delCh = (c) => setForm(f => ({ ...f, channels: f.channels.filter(x => x !== c) }));
  const addBs = () => { if (!newBs.trim()) return; setForm(f => ({ ...f, boxSizes: [...f.boxSizes, newBs.trim()] })); setNewBs(""); };
  const delBs = (b) => setForm(f => ({ ...f, boxSizes: f.boxSizes.filter(x => x !== b) }));

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="font-bold text-gray-800">Box Numbering</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prefix"><input className={inp} value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} /></Field>
          <Field label="Current Counter">
            <input type="number" className={inp} value={boxCounter} onChange={e => setBoxCounter(Number(e.target.value))} />
          </Field>
        </div>
        <div className="text-xs text-gray-400">Next box: <strong>{form.prefix}-{pad(boxCounter)}</strong></div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="font-bold text-gray-800">Channels</div>
        <div className="flex gap-2">{form.channels.map(c => <span key={c} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs font-semibold">{c}<button onClick={() => delCh(c)} className="text-red-400 ml-1">×</button></span>)}</div>
        <div className="flex gap-2"><input className={`${inp} flex-1`} placeholder="New channel…" value={newCh} onChange={e => setNewCh(e.target.value)} /><button onClick={addCh} className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-bold">Add</button></div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="font-bold text-gray-800">Box Sizes</div>
        <div className="flex gap-2 flex-wrap">{form.boxSizes.map(b => <span key={b} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs font-semibold">{b}<button onClick={() => delBs(b)} className="text-red-400 ml-1">×</button></span>)}</div>
        <div className="flex gap-2"><input className={`${inp} flex-1`} placeholder="New size…" value={newBs} onChange={e => setNewBs(e.target.value)} /><button onClick={addBs} className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-bold">Add</button></div>
      </div>

      <button onClick={save} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-sm">Save Settings</button>
    </div>
  );
}
