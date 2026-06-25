import { useState, useEffect } from "react";

const STORAGE_KEY = "pickle-tracker-data";
const LOW_STOCK_THRESHOLD = 5;

const INITIAL_PRODUCTS = [
  { id: "dill-pickles",  name: "Dill Pickles",   emoji: "🥒", defaultPrice: 8,  costPerUnit: 2.50, inventory: 0 },
  { id: "bread-butter",  name: "Bread & Butter",  emoji: "🥒", defaultPrice: 8,  costPerUnit: 2.50, inventory: 0 },
  { id: "spicy-pickles", name: "Spicy Pickles",   emoji: "🌶️", defaultPrice: 9,  costPerUnit: 2.75, inventory: 0 },
  { id: "olives",        name: "Olives",          emoji: "🫒", defaultPrice: 10, costPerUnit: 3.50, inventory: 0 },
];

const BLANK_PRODUCT = { id: "", name: "", emoji: "🥒", defaultPrice: "", costPerUnit: "", inventory: 0 };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const getMetrics = (sales) => {
  const now = new Date(), yr = now.getFullYear(), mo = now.getMonth();
  const ytd = sales.filter(s => new Date(s.date).getFullYear() === yr);
  const mtd = ytd.filter(s => new Date(s.date).getMonth() === mo);
  const calc = (arr) => ({
    revenue: arr.reduce((s,x) => s+x.totalPrice, 0),
    cost:    arr.reduce((s,x) => s+x.totalCost, 0),
    profit:  arr.reduce((s,x) => s+(x.totalPrice-x.totalCost), 0),
    units:   arr.reduce((s,x) => s+x.quantity, 0),
  });
  return { ytd: calc(ytd), mtd: calc(mtd) };
};

const getMonthlyData = (sales) => {
  const yr = new Date().getFullYear();
  return MONTHS.map((month, i) => {
    const ms = sales.filter(s => { const d = new Date(s.date); return d.getFullYear()===yr && d.getMonth()===i; });
    const rev  = ms.reduce((s,x) => s+x.totalPrice, 0);
    const cost = ms.reduce((s,x) => s+x.totalCost, 0);
    return { month, revenue: +rev.toFixed(2), profit: +(rev-cost).toFixed(2) };
  });
};

function SimpleBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.profit)), 1);
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, paddingBottom: 24 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: "calc(100% - 16px)" }}>
              <div style={{ flex: 1, background: "#D4A843", borderRadius: "3px 3px 0 0", height: `${(d.revenue/maxVal)*100}%`, minHeight: d.revenue>0?2:0 }} />
              <div style={{ flex: 1, background: "#5B8C3E", borderRadius: "3px 3px 0 0", height: `${(d.profit/maxVal)*100}%`, minHeight: d.profit>0?2:0 }} />
            </div>
            <div style={{ fontSize: 9, color: "#6B6B5A", fontWeight: 600, marginTop: 4 }}>{d.month}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6B6B5A" }}><div style={{ width: 10, height: 10, background: "#D4A843", borderRadius: 2 }} /> Revenue</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6B6B5A" }}><div style={{ width: 10, height: 10, background: "#5B8C3E", borderRadius: 2 }} /> Profit</div>
      </div>
    </div>
  );
}

function MetCard({ label, value, color, highlight }) {
  return (
    <div style={{ background: highlight?color:"#fff", border: highlight?"none":"1px solid #E8E0D0", borderRadius:12, padding:"14px 10px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize:17, fontWeight:800, color:highlight?"#fff":color, fontVariantNumeric:"tabular-nums" }}>{value}</div>
      <div style={{ fontSize:10, color:highlight?"rgba(255,255,255,0.75)":"#6B6B5A", marginTop:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
    </div>
  );
}

function SaleRow({ sale }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #F0EAE0" }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:"#1A2E1A" }}>{sale.emoji} {sale.quantity}× {sale.productName}</div>
        <div style={{ fontSize:11, color:"#9A9A8A" }}>
          {new Date(sale.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          {sale.customer?` · ${sale.customer}`:""}
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#1A2E1A" }}>${sale.totalPrice.toFixed(2)}</div>
        <div style={{ fontSize:11, color:"#5B8C3E", fontWeight:600 }}>+${(sale.totalPrice-sale.totalCost).toFixed(2)} profit</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:"#4A4A3A", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{children}</div>;
}

function Input({ style, ...props }) {
  return (
    <input {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #E8E0D0", fontSize:14, color:"#1A2E1A", background:"#FAFAF7", outline:"none", boxSizing:"border-box", ...style }}
      onFocus={e=>e.target.style.borderColor="#5B8C3E"} onBlur={e=>e.target.style.borderColor="#E8E0D0"} />
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, color:"#6B6B5A", fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>{children}</div>;
}

function StockBadge({ count }) {
  const color = count === 0 ? "#B22222" : count <= LOW_STOCK_THRESHOLD ? "#D4A843" : "#5B8C3E";
  const bg    = count === 0 ? "#FDF0F0" : count <= LOW_STOCK_THRESHOLD ? "#FFF8E8" : "#E8F5E0";
  const label = count === 0 ? "Out of stock" : count <= LOW_STOCK_THRESHOLD ? `${count} left — low` : `${count} in stock`;
  return <span style={{ fontSize:11, fontWeight:700, color, background:bg, padding:"3px 8px", borderRadius:20 }}>{label}</span>;
}

function ProductForm({ initial, onSave, onCancel, existingIds=[] }) {
  const [draft, setDraft] = useState(initial);
  const isNew = !initial.id;
  const set = (k,v) => setDraft(d=>({...d,[k]:v}));
  const valid = draft.name.trim() && draft.emoji.trim() && draft.defaultPrice!=="" && draft.costPerUnit!=="";
  const handleSave = () => {
    if (!valid) return;
    const id = isNew ? (()=>{ let b=slugify(draft.name)||"product",c=b,n=2; while(existingIds.includes(c)){c=`${b}-${n++}`} return c; })() : draft.id;
    onSave({...draft,id,defaultPrice:Number(draft.defaultPrice),costPerUnit:Number(draft.costPerUnit),inventory:Number(draft.inventory)||0});
  };
  return (
    <div style={{ background:"#F5F0E8", borderRadius:10, padding:14, marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"56px 1fr", gap:10, marginBottom:12 }}>
        <div><FieldLabel>Icon</FieldLabel><Input value={draft.emoji} onChange={e=>set("emoji",e.target.value)} style={{ textAlign:"center", fontSize:20, padding:"8px 4px" }} maxLength={2} /></div>
        <div><FieldLabel>Product name</FieldLabel><Input value={draft.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Garlic Dill" /></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div><FieldLabel>Cost per jar ($)</FieldLabel><Input type="number" step="0.01" min="0" value={draft.costPerUnit} onChange={e=>set("costPerUnit",e.target.value)} placeholder="2.50" /></div>
        <div><FieldLabel>Default price ($)</FieldLabel><Input type="number" step="0.01" min="0" value={draft.defaultPrice} onChange={e=>set("defaultPrice",e.target.value)} placeholder="8.00" /></div>
      </div>
      {draft.name && draft.defaultPrice && draft.costPerUnit && (
        <div style={{ fontSize:12, color:"#5B8C3E", fontWeight:600, marginBottom:12 }}>
          Margin: ${(Number(draft.defaultPrice)-Number(draft.costPerUnit)).toFixed(2)} per jar ({Number(draft.defaultPrice)>0?((Number(draft.defaultPrice)-Number(draft.costPerUnit))/Number(draft.defaultPrice)*100).toFixed(0):0}%)
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={handleSave} disabled={!valid} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:valid?"#5B8C3E":"#C8C0B0", color:"#fff", fontWeight:700, cursor:valid?"pointer":"not-allowed", fontSize:13 }}>{isNew?"Add Product":"Save Changes"}</button>
        <button onClick={onCancel} style={{ padding:"10px 16px", borderRadius:8, border:"1.5px solid #C8C0B0", background:"#fff", color:"#4A4A3A", cursor:"pointer", fontSize:13 }}>Cancel</button>
      </div>
    </div>
  );
}

export default function PickleTracker() {
  const [tab, setTab]               = useState("dashboard");
  const [sales, setSales]           = useState([]);
  const [products, setProducts]     = useState(INITIAL_PRODUCTS);
  const [inventoryLog, setInventoryLog] = useState([]);
  const [loaded, setLoaded]         = useState(false);

  // log sale form
  const [saleProduct, setSaleProduct]   = useState("");
  const [saleQty, setSaleQty]           = useState(1);
  const [salePrice, setSalePrice]       = useState("");
  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleDate, setSaleDate]         = useState(new Date().toISOString().split("T")[0]);
  const [saleNote, setSaleNote]         = useState("");
  const [saleSuccess, setSaleSuccess]   = useState(false);

  // product panel
  const [editProductId, setEditProductId]     = useState(null);
  const [showAddForm, setShowAddForm]         = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // inventory panel
  const [addStockProductId, setAddStockProductId] = useState(null);
  const [addStockQty, setAddStockQty]             = useState("");
  const [addStockNote, setAddStockNote]           = useState("");
  const [addStockDate, setAddStockDate]           = useState(new Date().toISOString().split("T")[0]);
  const [stockSuccess, setStockSuccess]           = useState(false);

  // history filter
  const [historyFilter, setHistoryFilter] = useState("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.sales)        setSales(d.sales);
        if (d.products)     setProducts(d.products);
        if (d.inventoryLog) setInventoryLog(d.inventoryLog);
      }
    } catch {}
    setLoaded(true);
  }, []);

  const persist = (s, p, il) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ sales: s, products: p, inventoryLog: il })); } catch {}
  };

  // log a sale + decrement inventory
  const handleLogSale = () => {
    if (!saleProduct || !salePrice || Number(saleQty) < 1) return;
    const product = products.find(p => p.id === saleProduct);
    const qty = Number(saleQty);

    const sale = {
      id: Date.now().toString(), date: saleDate,
      productId: product.id, productName: product.name, emoji: product.emoji,
      quantity: qty, pricePerUnit: Number(salePrice),
      totalPrice: Number(salePrice) * qty,
      costPerUnit: product.costPerUnit, totalCost: product.costPerUnit * qty,
      customer: saleCustomer, note: saleNote,
    };

    const ns = [sale, ...sales];
    const np = products.map(p => p.id === saleProduct
      ? { ...p, inventory: Math.max(0, (p.inventory || 0) - qty) }
      : p
    );

    setSales(ns); setProducts(np); persist(ns, np, inventoryLog);
    setSaleProduct(""); setSaleQty(1); setSalePrice(""); setSaleCustomer(""); setSaleNote("");
    setSaleDate(new Date().toISOString().split("T")[0]);
    setSaleSuccess(true); setTimeout(() => setSaleSuccess(false), 3000);
  };

  // add inventory stock
  const handleAddStock = () => {
    if (!addStockProductId || !addStockQty || Number(addStockQty) < 1) return;
    const product = products.find(p => p.id === addStockProductId);
    const qty = Number(addStockQty);

    const entry = {
      id: Date.now().toString(), date: addStockDate,
      productId: product.id, productName: product.name, emoji: product.emoji,
      quantity: qty, note: addStockNote,
    };

    const nil = [entry, ...inventoryLog];
    const np  = products.map(p => p.id === addStockProductId
      ? { ...p, inventory: (p.inventory || 0) + qty }
      : p
    );

    setInventoryLog(nil); setProducts(np); persist(sales, np, nil);
    setAddStockProductId(null); setAddStockQty(""); setAddStockNote("");
    setAddStockDate(new Date().toISOString().split("T")[0]);
    setStockSuccess(true); setTimeout(() => setStockSuccess(false), 3000);
  };

  const handleDeleteSale    = (id) => { const ns=sales.filter(s=>s.id!==id); setSales(ns); persist(ns,products,inventoryLog); };
  const handleAddProduct    = (p)  => { const np=[...products,p]; setProducts(np); persist(sales,np,inventoryLog); setShowAddForm(false); };
  const handleEditProduct   = (u)  => { const np=products.map(p=>p.id===u.id?u:p); setProducts(np); persist(sales,np,inventoryLog); setEditProductId(null); };
  const handleDeleteProduct = (id) => { const np=products.filter(p=>p.id!==id); setProducts(np); persist(sales,np,inventoryLog); setConfirmDeleteId(null); if(saleProduct===id)setSaleProduct(""); };

  if (!loaded) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F5F0E8",color:"#5B8C3E",fontWeight:700}}>Loading...</div>;

  const { ytd, mtd } = getMetrics(sales);
  const monthlyData   = getMonthlyData(sales);
  const filteredSales = historyFilter==="all" ? sales : sales.filter(s=>s.productId===historyFilter);
  const fmt = (n) => `$${n.toFixed(2)}`;
  const lowStockProducts = products.filter(p => (p.inventory||0) <= LOW_STOCK_THRESHOLD);
  const selectedProduct  = products.find(p => p.id === saleProduct);

  const TABS = [
    {id:"dashboard", label:"Dashboard", icon:"📊"},
    {id:"log",       label:"Log Sale",  icon:"➕"},
    {id:"inventory", label:"Inventory", icon:"📦"},
    {id:"history",   label:"History",   icon:"📋"},
    {id:"products",  label:"Products",  icon:"⚙️"},
  ];

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#F5F0E8",minHeight:"100vh"}}>

      {/* header */}
      <div style={{background:"#1A2E1A",padding:"16px 20px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:30}}>🥒</span>
        <div>
          <div style={{color:"#D4A843",fontWeight:800,fontSize:19}}>Pickle Tracker</div>
          <div style={{color:"#7AB87A",fontSize:12,fontWeight:500}}>Sales & Profit Dashboard</div>
        </div>
      </div>

      {/* tabs */}
      <div style={{background:"#fff",borderBottom:"1px solid #E8E0D0",display:"flex",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",minWidth:64,padding:"10px 8px",border:"none",background:"none",borderBottom:tab===t.id?"3px solid #5B8C3E":"3px solid transparent",color:tab===t.id?"#5B8C3E":"#6B6B5A",fontSize:10,fontWeight:tab===t.id?700:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:16}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"16px",maxWidth:560,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (<>
          {/* low stock alert */}
          {lowStockProducts.length > 0 && (
            <div style={{background:"#FFF8E8",border:"1.5px solid #D4A843",borderRadius:10,padding:"10px 14px",marginBottom:16,cursor:"pointer"}} onClick={()=>setTab("inventory")}>
              <div style={{fontSize:13,fontWeight:700,color:"#8B6000",marginBottom:4}}>⚠️ Low Stock Alert</div>
              <div style={{fontSize:12,color:"#6B4F00"}}>
                {lowStockProducts.map(p=>`${p.emoji} ${p.name} (${p.inventory||0} left)`).join(" · ")}
              </div>
              <div style={{fontSize:11,color:"#D4A843",fontWeight:600,marginTop:4}}>Tap to manage inventory →</div>
            </div>
          )}

          <SectionLabel>Month to Date</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:22}}>
            <MetCard label="Revenue" value={fmt(mtd.revenue)} color="#1A2E1A" />
            <MetCard label="Cost"    value={fmt(mtd.cost)}    color="#8B4513" />
            <MetCard label="Profit"  value={fmt(mtd.profit)}  color={mtd.profit>=0?"#3D6B2F":"#B22222"} highlight />
          </div>

          <SectionLabel>Year to Date</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:22}}>
            <MetCard label="Revenue" value={fmt(ytd.revenue)} color="#1A2E1A" />
            <MetCard label="Cost"    value={fmt(ytd.cost)}    color="#8B4513" />
            <MetCard label="Profit"  value={fmt(ytd.profit)}  color={ytd.profit>=0?"#3D6B2F":"#B22222"} highlight />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}>
            <div style={{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#1A2E1A"}}>{ytd.units}</div>
              <div style={{fontSize:10,color:"#6B6B5A",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:3}}>Jars Sold (YTD)</div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#D4A843"}}>{ytd.revenue>0?`${((ytd.profit/ytd.revenue)*100).toFixed(0)}%`:"—"}</div>
              <div style={{fontSize:10,color:"#6B6B5A",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:3}}>Margin (YTD)</div>
            </div>
          </div>

          <SectionLabel>Monthly Overview ({new Date().getFullYear()})</SectionLabel>
          <div style={{background:"#fff",borderRadius:12,padding:"16px 12px 12px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:22}}>
            <SimpleBarChart data={monthlyData} />
          </div>

          <SectionLabel>Recent Sales</SectionLabel>
          <div style={{background:"#fff",borderRadius:12,padding:"4px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            {sales.length===0 ? <div style={{textAlign:"center",color:"#9A9A8A",padding:"28px 0",fontSize:14}}>No sales yet — log your first jar! 🥒</div> : sales.slice(0,5).map(s=><SaleRow key={s.id} sale={s}/>)}
          </div>
          {sales.length>5 && <button onClick={()=>setTab("history")} style={{width:"100%",marginTop:8,padding:"11px",background:"none",border:"1.5px dashed #C8C0B0",borderRadius:10,color:"#5B8C3E",fontSize:13,cursor:"pointer",fontWeight:700}}>View all {sales.length} sales →</button>}
        </>)}

        {/* ── LOG SALE ── */}
        {tab==="log" && (
          <div style={{background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#1A2E1A",marginBottom:18}}>Log a Sale</div>
            {saleSuccess && <div style={{background:"#E8F5E0",border:"1.5px solid #5B8C3E",borderRadius:8,padding:"10px 14px",color:"#3D6B2F",fontSize:13,marginBottom:16,fontWeight:700}}>✅ Sale logged & inventory updated!</div>}

            {products.length===0 ? (
              <div style={{textAlign:"center",color:"#9A9A8A",padding:"24px 0",fontSize:13}}>No products yet — <button onClick={()=>setTab("products")} style={{color:"#5B8C3E",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontSize:13}}>add one in Products</button></div>
            ) : (<>
              <FieldLabel>Product</FieldLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {products.map(p=>(
                  <button key={p.id} onClick={()=>{setSaleProduct(p.id);setSalePrice(p.defaultPrice.toString());}}
                    style={{padding:"10px 8px",borderRadius:10,border:"2px solid",borderColor:saleProduct===p.id?"#5B8C3E":"#E8E0D0",background:saleProduct===p.id?"#E8F5E0":"#FAFAF7",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:3,fontSize:13,fontWeight:saleProduct===p.id?700:500,color:saleProduct===p.id?"#3D6B2F":"#333",textAlign:"left"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>{p.emoji}</span><span>{p.name}</span></div>
                    <StockBadge count={p.inventory||0} />
                  </button>
                ))}
              </div>

              {/* out of stock warning */}
              {selectedProduct && (selectedProduct.inventory||0) === 0 && (
                <div style={{background:"#FDF0F0",border:"1.5px solid #F0CCCC",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#B22222",fontWeight:600}}>
                  ⚠️ {selectedProduct.name} is out of stock. <button onClick={()=>setTab("inventory")} style={{color:"#B22222",background:"none",border:"none",cursor:"pointer",fontWeight:700,textDecoration:"underline",fontSize:13}}>Add inventory first</button>
                </div>
              )}

              {/* low stock warning */}
              {selectedProduct && (selectedProduct.inventory||0) > 0 && (selectedProduct.inventory||0) <= LOW_STOCK_THRESHOLD && (
                <div style={{background:"#FFF8E8",border:"1.5px solid #D4A843",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#8B6000",fontWeight:600}}>
                  ⚠️ Only {selectedProduct.inventory} {selectedProduct.name} left in stock.
                </div>
              )}

              {/* oversell warning */}
              {selectedProduct && Number(saleQty) > (selectedProduct.inventory||0) && (selectedProduct.inventory||0) > 0 && (
                <div style={{background:"#FDF0F0",border:"1.5px solid #F0CCCC",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#B22222",fontWeight:600}}>
                  ⚠️ You only have {selectedProduct.inventory} in stock but are logging {saleQty}.
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div><FieldLabel>Quantity</FieldLabel><Input type="number" min="1" value={saleQty} onChange={e=>setSaleQty(e.target.value)} /></div>
                <div><FieldLabel>Price per jar ($)</FieldLabel><Input type="number" step="0.01" value={salePrice} onChange={e=>setSalePrice(e.target.value)} placeholder="0.00" /></div>
              </div>
              <div style={{marginBottom:14}}><FieldLabel>Customer (optional)</FieldLabel><Input value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)} placeholder="Name or @venmo" /></div>
              <div style={{marginBottom:14}}><FieldLabel>Date</FieldLabel><Input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)} /></div>
              <div style={{marginBottom:18}}><FieldLabel>Note (optional)</FieldLabel><Input value={saleNote} onChange={e=>setSaleNote(e.target.value)} placeholder="e.g. farmers market, repeat customer" /></div>

              {saleProduct && salePrice && (
                <div style={{background:"#F5F0E8",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#3A3A2A"}}>
                  <strong>Preview:</strong> {saleQty}× {selectedProduct?.name} @ ${salePrice} = <strong>${(Number(salePrice)*Number(saleQty)).toFixed(2)}</strong>
                  <span style={{color:"#5B8C3E",fontWeight:700,marginLeft:8}}>(+${((Number(salePrice)-(selectedProduct?.costPerUnit||0))*Number(saleQty)).toFixed(2)} profit)</span>
                  {selectedProduct && <div style={{marginTop:4,fontSize:11,color:"#6B6B5A"}}>Stock after sale: {Math.max(0,(selectedProduct.inventory||0)-Number(saleQty))} jars</div>}
                </div>
              )}

              <button onClick={handleLogSale} disabled={!saleProduct||!salePrice||Number(saleQty)<1}
                style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:(!saleProduct||!salePrice||Number(saleQty)<1)?"#C8C0B0":"#5B8C3E",color:"#fff",fontSize:15,fontWeight:800,cursor:(!saleProduct||!salePrice||Number(saleQty)<1)?"not-allowed":"pointer"}}>
                Log Sale
              </button>
            </>)}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {tab==="inventory" && (<>
          {stockSuccess && <div style={{background:"#E8F5E0",border:"1.5px solid #5B8C3E",borderRadius:8,padding:"10px 14px",color:"#3D6B2F",fontSize:13,marginBottom:14,fontWeight:700}}>✅ Stock added!</div>}

          <SectionLabel>Current Stock</SectionLabel>
          {products.map(p=>(
            <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              {addStockProductId===p.id ? (
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1A2E1A",marginBottom:12}}>{p.emoji} {p.name} — Add Stock</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div><FieldLabel>Jars to add</FieldLabel><Input type="number" min="1" value={addStockQty} onChange={e=>setAddStockQty(e.target.value)} placeholder="e.g. 24" /></div>
                    <div><FieldLabel>Date</FieldLabel><Input type="date" value={addStockDate} onChange={e=>setAddStockDate(e.target.value)} /></div>
                  </div>
                  <div style={{marginBottom:14}}><FieldLabel>Batch note (optional)</FieldLabel><Input value={addStockNote} onChange={e=>setAddStockNote(e.target.value)} placeholder="e.g. Batch #5, farmers market prep" /></div>
                  {addStockQty && <div style={{fontSize:12,color:"#5B8C3E",fontWeight:600,marginBottom:12}}>Stock after adding: {(p.inventory||0)+Number(addStockQty)} jars</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={handleAddStock} disabled={!addStockQty||Number(addStockQty)<1}
                      style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:(!addStockQty||Number(addStockQty)<1)?"#C8C0B0":"#5B8C3E",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Add Stock
                    </button>
                    <button onClick={()=>setAddStockProductId(null)} style={{padding:"10px 16px",borderRadius:8,border:"1.5px solid #C8C0B0",background:"#fff",color:"#4A4A3A",cursor:"pointer",fontSize:13}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:"#1A2E1A",marginBottom:5}}>{p.emoji} {p.name}</div>
                    <StockBadge count={p.inventory||0} />
                  </div>
                  <button onClick={()=>{setAddStockProductId(p.id);setAddStockQty("");setAddStockNote("");setAddStockDate(new Date().toISOString().split("T")[0]);}}
                    style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid #5B8C3E",background:"#E8F5E0",color:"#3D6B2F",fontSize:12,cursor:"pointer",fontWeight:700}}>
                    + Add Stock
                  </button>
                </div>
              )}
            </div>
          ))}

          {inventoryLog.length > 0 && (<>
            <SectionLabel style={{marginTop:8}}>Restock History</SectionLabel>
            {inventoryLog.map(e=>(
              <div key={e.id} style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"#1A2E1A"}}>{e.emoji} +{e.quantity} {e.productName}</div>
                  <div style={{fontSize:11,color:"#6B6B5A",marginTop:2}}>{new Date(e.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                  {e.note&&<div style={{fontSize:11,color:"#9A9A8A",marginTop:2}}>{e.note}</div>}
                </div>
                <div style={{fontSize:12,color:"#5B8C3E",fontWeight:700,flexShrink:0,marginLeft:12}}>+{e.quantity} jars</div>
              </div>
            ))}
          </>)}
        </>)}

        {/* ── HISTORY ── */}
        {tab==="history" && (<>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {[{id:"all",label:"All"},...products.map(p=>({id:p.id,label:p.name}))].map(f=>(
              <button key={f.id} onClick={()=>setHistoryFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:historyFilter===f.id?"#5B8C3E":"#E8E0D0",color:historyFilter===f.id?"#fff":"#4A4A3A",fontSize:12,fontWeight:600,cursor:"pointer"}}>{f.label}</button>
            ))}
          </div>
          {filteredSales.length===0 ? <div style={{textAlign:"center",color:"#9A9A8A",padding:"48px 0",fontSize:14}}>No sales to show.</div>
            : filteredSales.map(s=>(
              <div key={s.id} style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#1A2E1A"}}>{s.emoji} {s.quantity}× {s.productName}</div>
                  <div style={{fontSize:12,color:"#6B6B5A",marginTop:2}}>{new Date(s.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{s.customer?` · ${s.customer}`:""}</div>
                  {s.note&&<div style={{fontSize:11,color:"#9A9A8A",marginTop:2}}>{s.note}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontWeight:800,color:"#1A2E1A",fontSize:15}}>${s.totalPrice.toFixed(2)}</div>
                  <div style={{fontSize:11,color:"#5B8C3E",fontWeight:600}}>+${(s.totalPrice-s.totalCost).toFixed(2)}</div>
                  <button onClick={()=>handleDeleteSale(s.id)} style={{fontSize:10,color:"#C07070",background:"none",border:"none",cursor:"pointer",marginTop:3,padding:0}}>Remove</button>
                </div>
              </div>
            ))
          }
        </>)}

        {/* ── PRODUCTS ── */}
        {tab==="products" && (<>
          <div style={{fontSize:13,color:"#6B6B5A",marginBottom:14,lineHeight:1.5}}>Add, edit, or remove products. Cost per jar drives all your profit calculations.</div>
          {showAddForm
            ? <ProductForm initial={BLANK_PRODUCT} existingIds={products.map(p=>p.id)} onSave={handleAddProduct} onCancel={()=>setShowAddForm(false)} />
            : <button onClick={()=>{setShowAddForm(true);setEditProductId(null);setConfirmDeleteId(null);}} style={{width:"100%",marginBottom:14,padding:"12px",borderRadius:10,border:"2px dashed #5B8C3E",background:"#E8F5E0",color:"#3D6B2F",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{fontSize:18}}>＋</span> Add New Product
              </button>
          }
          {products.map(p=>(
            <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              {editProductId===p.id
                ? <ProductForm initial={p} existingIds={products.map(x=>x.id).filter(id=>id!==p.id)} onSave={handleEditProduct} onCancel={()=>setEditProductId(null)} />
                : confirmDeleteId===p.id
                  ? <div>
                      <div style={{fontSize:14,color:"#1A2E1A",fontWeight:600,marginBottom:4}}>{p.emoji} {p.name}</div>
                      <div style={{fontSize:13,color:"#8B4513",marginBottom:12}}>Delete this product? Past sales won&apos;t be affected.</div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleDeleteProduct(p.id)} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#B22222",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Yes, delete</button>
                        <button onClick={()=>setConfirmDeleteId(null)} style={{padding:"10px 16px",borderRadius:8,border:"1.5px solid #C8C0B0",background:"#fff",color:"#4A4A3A",cursor:"pointer",fontSize:13}}>Cancel</button>
                      </div>
                    </div>
                  : <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:"#1A2E1A",marginBottom:4}}>{p.emoji} {p.name}</div>
                        <div style={{fontSize:12,color:"#6B6B5A",marginBottom:4}}>Cost: ${p.costPerUnit.toFixed(2)} · Default: ${p.defaultPrice.toFixed(2)}</div>
                        <StockBadge count={p.inventory||0} />
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:12}}>
                        <button onClick={()=>{setEditProductId(p.id);setShowAddForm(false);setConfirmDeleteId(null);}} style={{padding:"7px 12px",borderRadius:8,border:"1.5px solid #E8E0D0",background:"#F5F0E8",color:"#4A4A3A",fontSize:12,cursor:"pointer",fontWeight:600}}>Edit</button>
                        <button onClick={()=>{setConfirmDeleteId(p.id);setEditProductId(null);setShowAddForm(false);}} style={{padding:"7px 12px",borderRadius:8,border:"1.5px solid #F0CCCC",background:"#FDF0F0",color:"#B22222",fontSize:12,cursor:"pointer",fontWeight:600}}>Delete</button>
                      </div>
                    </div>
              }
            </div>
          ))}
          {products.length===0&&!showAddForm&&<div style={{textAlign:"center",color:"#9A9A8A",padding:"32px 0",fontSize:14}}>No products yet. Add one above.</div>}
        </>)}

      </div>
    </div>
  );
}
