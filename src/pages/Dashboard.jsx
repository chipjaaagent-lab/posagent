import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { orderDb, ingredientDb } from '../lib/db'
import { TrendingUp, ShoppingBag, AlertTriangle, ShoppingCart, Package } from 'lucide-react'

function fmt(n) {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Dashboard({ onNavigate }) {
  const { currentShop } = useShop()
  const [s, setS] = useState({ orderCount: 0, itemCount: 0, subtotal: 0, totalFees: 0, totalCost: 0, netReceived: 0, netProfit: 0 })
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [summary, low] = await Promise.all([
          orderDb.getTodaySummary(currentShop.id),
          ingredientDb.getLowStock(currentShop.id),
        ])
        setS(summary)
        setLowStock(low)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [currentShop.id])

  const margin = s.subtotal > 0 ? ((s.netProfit / s.subtotal) * 100).toFixed(1) : 0

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>หน้าหลัก</h1>
          <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ borderRadius: 12 }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>⚠️ วัตถุดิบใกล้หมด {lowStock.length} รายการ</div>
            {lowStock.slice(0, 3).map(i => (
              <div key={i.id} className="text-sm">• {i.name} เหลือ {fmt(i.stock)} {i.unitType === 'gram' ? 'กรัม' : 'ชิ้น'}</div>
            ))}
            {lowStock.length > 3 && <div className="text-sm">และอีก {lowStock.length - 3} รายการ...</div>}
            <button onClick={() => onNavigate('ingredients')} style={{ background: 'none', border: 'none', color: '#92400e', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: 6, fontSize: '0.9rem', textDecoration: 'underline' }}>
              ดูทั้งหมด →
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 12, color: '#6b7280' }}>สรุปยอดวันนี้</h3>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <div className="stat-label">🧾 ออเดอร์</div>
          <div className="stat-value text-primary">{s.orderCount}</div>
          <div className="text-xs text-muted mt-1">{s.itemCount} รายการ</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">💰 ยอดขายรวม</div>
          <div className="stat-value">{fmt(s.subtotal)}</div>
          <div className="text-xs text-muted mt-1">บาท</div>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <div className="stat-label">📉 GP/Ads/คูปอง</div>
          <div className="stat-value text-warning">{fmt(s.totalFees)}</div>
          <div className="text-xs text-muted mt-1">บาท</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🧾 ต้นทุนวัตถุดิบ</div>
          <div className="stat-value text-danger">{fmt(s.totalCost)}</div>
          <div className="text-xs text-muted mt-1">บาท</div>
        </div>
      </div>

      <div className="stat-card" style={{ marginBottom: 16, background: s.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', border: `2px solid ${s.netProfit >= 0 ? '#22c55e' : '#ef4444'}` }}>
        <div className="stat-label">{s.netProfit >= 0 ? '📈 กำไรสุทธิวันนี้' : '📉 ขาดทุนสุทธิวันนี้'} (หลังหักทุกอย่าง)</div>
        <div className={`stat-value ${s.netProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '2rem' }}>{fmt(s.netProfit)} บาท</div>
        <div className="text-xs text-muted mt-1">คิดเป็น {margin}% ของยอดขาย</div>
      </div>

      {s.subtotal > 0 && (
        <div className="alert alert-success" style={{ borderRadius: 12, marginBottom: 20 }}>
          <TrendingUp size={20} style={{ flexShrink: 0 }} />
          <div className="text-sm">
            <span className="font-semibold">ยอดขาย ≠ กำไร</span> — ขายได้ <strong>{fmt(s.subtotal)} ฿</strong> หัก GP/Ads/คูปอง <strong>{fmt(s.totalFees)} ฿</strong> และต้นทุน <strong>{fmt(s.totalCost)} ฿</strong> {s.netProfit >= 0 ? 'เหลือกำไรจริง' : 'ขาดทุนจริง'} <strong>{fmt(s.netProfit)} ฿</strong>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 12, color: '#6b7280' }}>ทางลัด</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-lg btn-full" onClick={() => onNavigate('order')}>
          <ShoppingCart size={22} /> เปิดออเดอร์ใหม่
        </button>
        <div className="grid-2">
          <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('ingredients')}><Package size={20} /> วัตถุดิบ</button>
          <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('menus')}><ShoppingBag size={20} /> เมนู</button>
        </div>
      </div>
    </div>
  )
}
