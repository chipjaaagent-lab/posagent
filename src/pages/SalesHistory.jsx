import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { orderDb } from '../lib/db'
import { History, ChevronDown, ChevronUp } from 'lucide-react'

function fmt(n) { return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(iso) { return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) }

export default function SalesHistory() {
  const { currentShop } = useShop()
  const [orders, setOrders] = useState([])
  const [filterDate, setFilterDate] = useState(new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = filterDate
          ? await orderDb.getByDate(currentShop.id, filterDate)
          : await orderDb.getAll(currentShop.id)
        setOrders(data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [currentShop.id, filterDate])

  const totalSubtotal = orders.reduce((s, o) => s + o.subtotal, 0)
  const totalFees = orders.reduce((s, o) => s + o.gpAmount + o.adsFee + o.couponDiscount, 0)
  const totalCost = orders.reduce((s, o) => s + o.totalCost, 0)
  const totalProfit = orders.reduce((s, o) => s + o.netProfit, 0)

  return (
    <div className="page">
      <div className="page-header"><h1>ประวัติการขาย</h1></div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">กรองตามวันที่</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-control" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={() => setFilterDate('')} style={{ whiteSpace: 'nowrap' }}>ทั้งหมด</button>
        </div>
      </div>

      {!loading && orders.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ textAlign: 'center' }}><div className="text-xs text-muted">ออเดอร์</div><div className="font-bold text-primary">{orders.length}</div></div>
          <div style={{ textAlign: 'center' }}><div className="text-xs text-muted">ยอดขาย</div><div className="font-bold">{fmt(totalSubtotal)}</div></div>
          <div style={{ textAlign: 'center' }}><div className="text-xs text-muted">ค่าธรรมเนียม</div><div className="font-bold text-warning">{fmt(totalFees)}</div></div>
          <div style={{ textAlign: 'center' }}><div className="text-xs text-muted">ต้นทุน</div><div className="font-bold text-danger">{fmt(totalCost)}</div></div>
          <div style={{ textAlign: 'center' }}><div className="text-xs text-muted">กำไรสุทธิ</div><div className="font-bold text-success">{fmt(totalProfit)}</div></div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40, color: '#9ca3af' }}>กำลังโหลด...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><History size={48} /><p className="font-semibold mt-2">ไม่มีรายการ</p><p className="text-sm mt-1">{filterDate ? 'วันที่เลือกยังไม่มีการขาย' : 'ยังไม่มีประวัติ'}</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => {
            const expanded = expandedId === order.id
            return (
              <div key={order.id} className="card">
                <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : order.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {order.orderNo != null && <span className="badge badge-gray">#{order.orderNo}</span>}
                        <span className="badge badge-primary">{order.channelName}</span>
                        <span className="text-sm font-semibold">{order.itemCount} รายการ</span>
                      </div>
                      <div className="text-xs text-muted mt-1">{fmtDate(order.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div><div className={`font-bold ${order.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(order.netProfit)} ฿</div><div className="text-xs text-muted">กำไรสุทธิ</div></div>
                      {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                    </div>
                  </div>
                  <div className="text-sm text-muted mt-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.items.map(it => `${it.menuName}×${it.qty}`).join(', ')}
                  </div>
                  {order.note && <div className="text-sm mt-1" style={{ color: '#374151' }}>📝 {order.note}</div>}
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px' }}>
                    {order.items.map((it, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-sm font-semibold">{it.menuName} × {it.qty}</span><span className="text-sm">{fmt(it.lineRevenue)} ฿</span></div>
                        <div className="text-xs text-muted" style={{ paddingLeft: 8 }}>ต้นทุน {fmt(it.lineCost)} ฿</div>
                      </div>
                    ))}
                    <div className="divider" />
                    <Row label="ราคาขายรวม" value={fmt(order.subtotal)} />
                    {order.gpAmount > 0 && <Row label={`GP ${order.gpPercent}%`} value={`-${fmt(order.gpAmount)}`} danger />}
                    {order.adsFee > 0 && <Row label="ค่า Ads" value={`-${fmt(order.adsFee)}`} danger />}
                    {order.couponDiscount > 0 && <Row label="คูปองส่วนลด" value={`-${fmt(order.couponDiscount)}`} danger />}
                    <Row label="เงินเข้าร้าน" value={fmt(order.netReceived)} bold />
                    <Row label="ต้นทุนวัตถุดิบ" value={`-${fmt(order.totalCost)}`} danger />
                    <div className="divider" />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="font-bold">กำไรสุทธิ</span>
                      <strong className={order.netProfit >= 0 ? 'text-success' : 'text-danger'} style={{ fontSize: '1.1rem' }}>{fmt(order.netProfit)} ฿</strong>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, danger, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span className={bold ? 'font-semibold text-sm' : 'text-muted text-sm'}>{label}</span>
      <strong className={danger ? 'text-danger text-sm' : 'text-sm'} style={{ fontWeight: bold ? 700 : 600 }}>{value}</strong>
    </div>
  )
}
