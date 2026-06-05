import { useState, useEffect, useRef } from 'react'
import { marketDb } from '../lib/db'
import { Check, Plus, Trash2, Copy, RotateCcw, ShoppingBasket, X } from 'lucide-react'

const SHOPS = [
  {
    key: 'pizza', label: '🍕 Pizza 5 ดาว',
    presets: ['แฮมหมู', 'ไส้กรอกหมู', 'เบคอน', 'ปูอัด', 'สับปะรด', 'กุ้ง', 'ปลาหมึก', 'พริกหวาน', 'ผักโขม'],
  },
  {
    key: 'mama', label: '🍜 มาม่านานาชาติ',
    presets: ['ผักรวม', 'นารูโตะ', 'กุ้งขาวไว้หาง', 'ไข่', 'ผักกาดขาว', 'ปูอัด', 'กิมจิ', 'ไส้กรอกชีส', 'เต้าหู้ปลา', 'เบค่อน', 'ชีส', 'หมูสับ', 'หมูเด้ง', 'ปลาหมึกแช่แข็ง', 'ปลาแผ่น', 'สาหร่ายวากาเมะ', 'แฮม', 'ไส้กรอก', 'หมูสามชั้นสไลด์', 'สาหร่ายโรยหน้า'],
  },
]

function fmt(n) { return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }

const QTY_UNITS = ['g', 'kg', 'ขีด', 'ชิ้น', 'แพ็ค', 'ถุง', 'ฟอง', 'แผ่น']
const SHELF_UNITS = ['วัน', 'เดือน', 'ปี']
function nextUnit(list, cur) {
  const i = list.indexOf(cur)
  return list[(i + 1) % list.length]
}
function mapRow(r) {
  return {
    id: r.id, shopKey: r.shop_key, name: r.name, bought: r.bought,
    qtyNum: r.qty_num ?? '', qtyUnit: r.qty_unit || 'g',
    price: r.price || 0,
    shelfNum: r.shelf_num ?? '', shelfUnit: r.shelf_unit || 'วัน',
    isCustom: r.is_custom, sort: r.sort,
  }
}

export default function Market() {
  const [shopKey, setShopKey] = useState('pizza')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [synced, setSynced] = useState(false)
  const saveTimers = useRef({})
  const editingRef = useRef(null) // id ของแถวที่กำลังพิมพ์อยู่ (กันโดนทับ)

  const shop = SHOPS.find(s => s.key === shopKey)

  async function load(key) {
    setLoading(true)
    try {
      const data = await marketDb.seedIfEmpty(key, SHOPS.find(s => s.key === key).presets)
      setItems(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(shopKey) }, [shopKey])

  // Realtime sync ระหว่างเครื่อง
  useEffect(() => {
    const unsub = marketDb.subscribe(shopKey, payload => {
      setSynced(true); setTimeout(() => setSynced(false), 1200)
      const { eventType, new: row, old } = payload
      if (eventType === 'INSERT') {
        const item = mapRow(row)
        setItems(prev => prev.some(p => p.id === item.id) ? prev : [...prev, item])
      } else if (eventType === 'DELETE') {
        setItems(prev => prev.filter(p => p.id !== old.id))
      } else if (eventType === 'UPDATE') {
        const item = mapRow(row)
        setItems(prev => prev.map(p => {
          if (p.id !== item.id) return p
          // ถ้ากำลังพิมพ์แถวนี้อยู่ อย่าทับ
          if (editingRef.current === item.id) return p
          return item
        }))
      }
    })
    return unsub
  }, [shopKey])

  // อัปเดต state ทันที + เซฟแบบ debounce
  function patch(id, fields, immediate = false) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...fields } : it))
    if (immediate) {
      marketDb.update(id, fields).catch(console.error)
    } else {
      clearTimeout(saveTimers.current[id])
      saveTimers.current[id] = setTimeout(() => marketDb.update(id, fields).catch(console.error), 600)
    }
  }

  async function addCustom() {
    if (!newName.trim()) return
    try {
      const item = await marketDb.addCustom(shopKey, newName.trim(), items.length)
      setItems(prev => [...prev, item])
      setNewName('')
    } catch (e) { console.error(e) }
  }

  async function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id))
    marketDb.remove(id).catch(console.error)
  }

  async function doReset() {
    try {
      await marketDb.resetBought(shopKey)
      setResetConfirm(false)
      load(shopKey)
    } catch (e) { console.error(e) }
  }

  function copySummary() {
    const bought = items.filter(it => it.bought)
    if (bought.length === 0) return
    const lines = bought.map(it => {
      const parts = [it.name]
      if (it.qtyNum !== '' && it.qtyNum != null) parts.push(`${it.qtyNum}${it.qtyUnit}`)
      if (it.price) parts.push(`${fmt(it.price)}฿`)
      if (it.shelfNum !== '' && it.shelfNum != null) parts.push(`อายุ ${it.shelfNum} ${it.shelfUnit}`)
      return '• ' + parts.join(' — ')
    })
    const total = bought.reduce((s, it) => s + (Number(it.price) || 0), 0)
    const text = `🛒 ${shop.label}\n${lines.join('\n')}\n\nรวม ${fmt(total)} บาท (${bought.length} รายการ)`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const boughtCount = items.filter(it => it.bought).length
  const totalPrice = items.reduce((s, it) => s + (it.bought ? (Number(it.price) || 0) : 0), 0)

  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: '#16a34a', color: 'white', padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingBasket size={24} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>รายการซื้อของ</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>ติ๊กของที่ซื้อ · ใส่ปริมาณ ราคา อายุ</div>
          </div>
          {synced && <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.25)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>🔄 ซิงค์แล้ว</span>}
          <a href="/" style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, color: 'white', textDecoration: 'none', whiteSpace: 'nowrap' }}>← แอปหลัก</a>
        </div>
      </div>

      {/* Shop tabs */}
      <div style={{ display: 'flex', gap: 8, padding: 12, background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 60, zIndex: 40 }}>
        {SHOPS.map(s => (
          <button key={s.key} onClick={() => setShopKey(s.key)}
            style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: '2px solid', borderColor: shopKey === s.key ? '#16a34a' : '#e5e7eb', background: shopKey === s.key ? '#f0fdf4' : 'white', color: shopKey === s.key ? '#16a34a' : '#6b7280', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5' }}>
        <div className="text-sm">
          <strong className="text-success">ซื้อแล้ว {boughtCount}</strong> / {items.length} รายการ · รวม <strong>{fmt(totalPrice)} ฿</strong>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={copySummary} disabled={boughtCount === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, background: copied ? '#16a34a' : 'white', color: copied ? 'white' : '#16a34a', border: '1px solid #16a34a', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: boughtCount === 0 ? 0.4 : 1 }}>
            <Copy size={14} /> {copied ? 'คัดลอกแล้ว!' : 'คัดลอกสรุป'}
          </button>
          <button onClick={() => setResetConfirm(true)} style={{ display: 'flex', alignItems: 'center', background: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: 12, paddingBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(it => (
              <div key={it.id} style={{ background: it.bought ? '#f0fdf4' : 'white', border: '2px solid', borderColor: it.bought ? '#86efac' : '#e5e7eb', borderRadius: 12, padding: 12, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* tick */}
                  <button onClick={() => patch(it.id, { bought: !it.bought }, true)}
                    style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, border: '2px solid', borderColor: it.bought ? '#16a34a' : '#d1d5db', background: it.bought ? '#16a34a' : 'white', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {it.bought && <Check size={20} strokeWidth={3} />}
                  </button>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: '1.02rem', textDecoration: it.bought ? 'none' : 'none', color: it.bought ? '#166534' : '#1f2937' }}>
                    {it.name}
                    {it.isCustom && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>(เพิ่มเอง)</span>}
                  </div>
                  <button onClick={() => removeItem(it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* fields: เลข + แตะสลับหน่วย — พอดี 1 บรรทัด */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <NumUnit label="ปริมาณ" placeholder="500"
                    value={it.qtyNum} onValue={v => patch(it.id, { qtyNum: v })}
                    unit={it.qtyUnit} onUnit={() => patch(it.id, { qtyUnit: nextUnit(QTY_UNITS, it.qtyUnit) }, true)}
                    onFocus={() => editingRef.current = it.id} onBlur={() => editingRef.current = null} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600 }}>ราคา</span>
                    <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      <input type="number" inputMode="decimal" placeholder="120" value={it.price || ''} onChange={e => patch(it.id, { price: e.target.value })}
                        onFocus={() => editingRef.current = it.id} onBlur={() => editingRef.current = null}
                        style={{ width: '100%', padding: '8px 2px', border: 'none', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center', minWidth: 0, outline: 'none' }} />
                      <span style={{ padding: '0 6px', color: '#9ca3af', fontWeight: 700, fontSize: '0.8rem' }}>฿</span>
                    </div>
                  </div>
                  <NumUnit label="อายุ" placeholder="7"
                    value={it.shelfNum} onValue={v => patch(it.id, { shelfNum: v })}
                    unit={it.shelfUnit} onUnit={() => patch(it.id, { shelfUnit: nextUnit(SHELF_UNITS, it.shelfUnit) }, true)}
                    onFocus={() => editingRef.current = it.id} onBlur={() => editingRef.current = null} />
                </div>
              </div>
            ))}

            {/* Add custom */}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()}
                placeholder="เพิ่มรายการเอง... (ใส่ชื่อ)"
                style={{ flex: 1, padding: '14px 16px', border: '2px dashed #86efac', borderRadius: 12, fontFamily: 'inherit', fontSize: '1rem', background: 'white' }} />
              <button onClick={addCustom} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 12, padding: '0 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'inherit' }}>
                <Plus size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset confirm */}
      {resetConfirm && (
        <div className="modal-overlay" onClick={() => setResetConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
              <h2>ล้างรายการที่ติ๊กไว้?</h2>
              <p className="text-muted mt-2">จะเอาเครื่องหมายถูก ปริมาณ ราคา อายุ ออกทั้งหมดของ {shop.label} (ไม่ลบชื่อรายการ)</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setResetConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-primary flex-1" onClick={doReset} style={{ background: '#16a34a' }}>ล้างเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NumUnit({ label, placeholder, value, onValue, unit, onUnit, onFocus, onBlur }) {
  return (
    <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '2px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <input
          type="number" inputMode="decimal" placeholder={placeholder} value={value}
          onChange={e => onValue(e.target.value)} onFocus={onFocus} onBlur={onBlur}
          style={{ flex: 1, width: '100%', padding: '8px 2px', border: 'none', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center', minWidth: 0, outline: 'none' }}
        />
        <button onClick={onUnit}
          style={{ flexShrink: 0, minWidth: 40, border: 'none', borderLeft: '2px solid #e5e7eb', background: '#f0fdf4', color: '#16a34a', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', padding: '0 4px' }}>
          {unit}
        </button>
      </div>
    </div>
  )
}
