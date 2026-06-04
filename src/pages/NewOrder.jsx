import { useState, useEffect, useMemo } from 'react'
import { useShop } from '../lib/shopContext'
import { menuDb, ingredientDb, orderDb, channelDb } from '../lib/db'
import { Plus, Minus, CheckCircle, ShoppingCart, Trash2, Receipt } from 'lucide-react'

function fmt(n, d = 2) {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export default function NewOrder() {
  const { currentShop } = useShop()
  const [menus, setMenus] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [channels, setChannels] = useState([])

  const [cart, setCart] = useState([]) // [{ menuId, qty }]
  const [channelId, setChannelId] = useState('')
  const [gpEnabled, setGpEnabled] = useState(true)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [adsFee, setAdsFee] = useState(0)
  const [couponEnabled, setCouponEnabled] = useState(false)
  const [couponAmount, setCouponAmount] = useState('')

  const [showSuccess, setShowSuccess] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)

  function loadData() {
    setMenus(menuDb.getAll(currentShop.id))
    setIngredients(ingredientDb.getAll(currentShop.id))
    const chs = channelDb.getAll(currentShop.id)
    setChannels(chs)
    return chs
  }

  useEffect(() => {
    const chs = loadData()
    const def = chs.find(c => c.isDefault) || chs[0]
    if (def) {
      setChannelId(def.id)
      setGpEnabled(def.gpPercent > 0)
      setAdsFee(def.adsDefault)
    }
  }, [currentShop.id])

  const channel = channels.find(c => c.id === channelId)

  // เมื่อเปลี่ยนช่องทาง → reset default GP/Ads ของช่องทางนั้น
  function selectChannel(id) {
    setChannelId(id)
    const ch = channels.find(c => c.id === id)
    if (ch) {
      setGpEnabled(ch.gpPercent > 0)
      setAdsFee(ch.adsDefault)
      setAdsEnabled(false)
    }
  }

  function menuCost(menu) {
    return (menu.latestRecipe || []).reduce((s, r) => {
      const ing = ingredients.find(i => i.id === r.ingredientId)
      return s + (ing ? ing.costPerUnit * Number(r.qty) : 0)
    }, 0)
  }

  function addToCart(menuId) {
    setCart(prev => {
      const exists = prev.find(c => c.menuId === menuId)
      if (exists) return prev.map(c => c.menuId === menuId ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuId, qty: 1 }]
    })
  }

  function changeQty(menuId, delta) {
    setCart(prev => prev
      .map(c => c.menuId === menuId ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    )
  }

  function removeFromCart(menuId) {
    setCart(prev => prev.filter(c => c.menuId !== menuId))
  }

  // ─── Calculation ──────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    let subtotal = 0
    let totalCost = 0
    cart.forEach(c => {
      const menu = menus.find(m => m.id === c.menuId)
      if (!menu) return
      subtotal += menu.sellingPrice * c.qty
      totalCost += menuCost(menu) * c.qty
    })
    const gpPercent = channel?.gpPercent || 0
    const gpAmount = gpEnabled ? subtotal * (gpPercent / 100) : 0
    const ads = adsEnabled ? (Number(adsFee) || 0) : 0
    const coupon = couponEnabled ? (Number(couponAmount) || 0) : 0
    const netReceived = subtotal - gpAmount - ads - coupon
    const netProfit = netReceived - totalCost
    return { subtotal, totalCost, gpPercent, gpAmount, ads, coupon, netReceived, netProfit }
  }, [cart, menus, ingredients, channel, gpEnabled, adsEnabled, adsFee, couponEnabled, couponAmount])

  function handleSave() {
    if (cart.length === 0 || !channel) return

    const items = cart.map(c => {
      const menu = menus.find(m => m.id === c.menuId)
      const snapshot = (menu.latestRecipe || []).map(r => {
        const ing = ingredients.find(i => i.id === r.ingredientId)
        return {
          ingredientId: r.ingredientId,
          name: ing?.name || '',
          qty: Number(r.qty),
          unitType: ing?.unitType || r.unitType,
          costPerUnit: ing?.costPerUnit || 0,
          subtotal: (ing?.costPerUnit || 0) * Number(r.qty),
        }
      })
      const unitCost = snapshot.reduce((s, x) => s + x.subtotal, 0)
      return {
        menuId: menu.id,
        menuName: `${menu.name}${menu.size ? ` (${menu.size})` : ''}`,
        sellingPrice: menu.sellingPrice,
        qty: c.qty,
        ingredients: snapshot,
        unitCost,
        lineCost: unitCost * c.qty,
        lineRevenue: menu.sellingPrice * c.qty,
      }
    })

    const order = orderDb.add(currentShop.id, {
      channelName: channel.name,
      gpPercent: channel.gpPercent,
      gpEnabled,
      adsFee: calc.ads,
      couponDiscount: calc.coupon,
      items,
    })

    setSavedOrder(order)
    setShowSuccess(true)
    loadData()
  }

  function resetOrder() {
    setCart([])
    setCouponEnabled(false)
    setCouponAmount('')
    setAdsEnabled(false)
    if (channel) setAdsFee(channel.adsDefault)
    setShowSuccess(false)
    setSavedOrder(null)
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  if (showSuccess && savedOrder) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
        <CheckCircle size={72} color="#22c55e" />
        <h2 style={{ marginTop: 16, marginBottom: 4 }}>บันทึกออเดอร์แล้ว!</h2>
        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>{savedOrder.channelName} · {savedOrder.itemCount} รายการ</p>

        <div className="card" style={{ width: '100%', maxWidth: 380 }}>
          <div className="card-body">
            {savedOrder.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span className="text-sm">{it.menuName} × {it.qty}</span>
                <span className="text-sm">{fmt(it.lineRevenue)} ฿</span>
              </div>
            ))}
            <div className="divider" />
            <Row label="ราคาขายรวม" value={fmt(savedOrder.subtotal)} />
            {savedOrder.gpAmount > 0 && <Row label={`GP ${savedOrder.gpPercent}%`} value={`-${fmt(savedOrder.gpAmount)}`} danger />}
            {savedOrder.adsFee > 0 && <Row label="ค่า Ads" value={`-${fmt(savedOrder.adsFee)}`} danger />}
            {savedOrder.couponDiscount > 0 && <Row label="คูปองส่วนลด" value={`-${fmt(savedOrder.couponDiscount)}`} danger />}
            <Row label="เงินเข้าร้าน" value={fmt(savedOrder.netReceived)} bold />
            <Row label="ต้นทุนวัตถุดิบ" value={`-${fmt(savedOrder.totalCost)}`} danger />
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-bold">กำไรสุทธิ</span>
              <strong className={savedOrder.netProfit >= 0 ? 'text-success' : 'text-danger'} style={{ fontSize: '1.5rem' }}>{fmt(savedOrder.netProfit)} ฿</strong>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-full mt-4" style={{ maxWidth: 380 }} onClick={resetOrder}>
          <ShoppingCart size={20} /> เปิดออเดอร์ใหม่
        </button>
      </div>
    )
  }

  const menusWithoutRecipe = cart.some(c => {
    const m = menus.find(x => x.id === c.menuId)
    return m && (!m.latestRecipe || m.latestRecipe.length === 0)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>เปิดออเดอร์</h1>
        {cart.length > 0 && (
          <button className="btn btn-secondary" onClick={resetOrder} style={{ fontSize: '0.85rem' }}>
            <Trash2 size={16} /> ล้าง
          </button>
        )}
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">
          <Receipt size={48} />
          <p className="font-semibold mt-2">ยังไม่มีเมนู</p>
          <p className="text-sm mt-1">กรุณาเพิ่มเมนูและตั้งสูตรก่อน</p>
        </div>
      ) : (
        <>
          {/* Menu grid — tap to add */}
          <h3 style={{ marginBottom: 10, color: '#6b7280' }}>แตะเมนูเพื่อเพิ่ม</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {menus.map(menu => {
              const inCart = cart.find(c => c.menuId === menu.id)
              return (
                <button
                  key={menu.id}
                  onClick={() => addToCart(menu.id)}
                  style={{
                    position: 'relative', textAlign: 'left', cursor: 'pointer',
                    background: inCart ? '#fff0eb' : 'white',
                    border: '2px solid', borderColor: inCart ? '#FF6B35' : '#e5e7eb',
                    borderRadius: 14, padding: '14px', transition: 'all 0.12s',
                  }}
                >
                  {inCart && (
                    <span style={{ position: 'absolute', top: 8, right: 8, background: '#FF6B35', color: 'white', borderRadius: 999, minWidth: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, padding: '0 6px' }}>
                      {inCart.qty}
                    </span>
                  )}
                  <div className="font-semibold" style={{ fontSize: '0.98rem', paddingRight: 24 }}>{menu.name}</div>
                  {menu.size && <div className="text-xs text-muted">{menu.size}</div>}
                  <div className="font-bold text-primary mt-1">{fmt(menu.sellingPrice)} ฿</div>
                  {(!menu.latestRecipe || menu.latestRecipe.length === 0) && (
                    <div className="text-xs text-warning mt-1">⚠ ยังไม่มีสูตร</div>
                  )}
                </button>
              )
            })}
          </div>

          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <ShoppingCart size={40} />
              <p className="text-sm mt-2">ยังไม่มีรายการในออเดอร์</p>
            </div>
          ) : (
            <>
              {/* Cart */}
              <h3 style={{ marginBottom: 10, color: '#6b7280' }}>รายการในออเดอร์</h3>
              <div className="card" style={{ marginBottom: 16 }}>
                {cart.map((c, idx) => {
                  const menu = menus.find(m => m.id === c.menuId)
                  if (!menu) return null
                  return (
                    <div key={c.menuId} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: idx < cart.length - 1 ? '1px solid #f3f4f6' : 'none', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold text-sm">{menu.name}{menu.size ? ` (${menu.size})` : ''}</div>
                        <div className="text-xs text-muted">{fmt(menu.sellingPrice)} ฿ · ต้นทุน {fmt(menuCost(menu))} ฿</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn-icon btn-secondary" style={{ minWidth: 38, minHeight: 38, padding: 6 }} onClick={() => changeQty(c.menuId, -1)}><Minus size={16} /></button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>{c.qty}</span>
                        <button className="btn btn-icon btn-secondary" style={{ minWidth: 38, minHeight: 38, padding: 6 }} onClick={() => changeQty(c.menuId, 1)}><Plus size={16} /></button>
                      </div>
                      <div style={{ minWidth: 64, textAlign: 'right' }} className="font-semibold text-sm">{fmt(menu.sellingPrice * c.qty)} ฿</div>
                    </div>
                  )
                })}
              </div>

              {/* Channel */}
              <h3 style={{ marginBottom: 10, color: '#6b7280' }}>ช่องทางขาย</h3>
              <div className="segment" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                {channels.map(ch => (
                  <button key={ch.id} className={`segment-item ${channelId === ch.id ? 'active' : ''}`} onClick={() => selectChannel(ch.id)}>
                    {ch.name}
                  </button>
                ))}
              </div>

              {/* Fees toggles */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* GP */}
                  {channel && channel.gpPercent > 0 && (
                    <ToggleRow
                      checked={gpEnabled}
                      onToggle={() => setGpEnabled(v => !v)}
                      label={`GP ${channel.gpPercent}%`}
                      sub="ค่าธรรมเนียมแพลตฟอร์ม"
                      amount={gpEnabled ? `-${fmt(calc.gpAmount)} ฿` : null}
                    />
                  )}

                  {/* Ads */}
                  <ToggleRow
                    checked={adsEnabled}
                    onToggle={() => setAdsEnabled(v => !v)}
                    label="ค่า Ads (โฆษณา)"
                    sub="ออเดอร์นี้มาจากโฆษณา"
                    amount={adsEnabled ? `-${fmt(Number(adsFee) || 0)} ฿` : null}
                    extra={adsEnabled && (
                      <input
                        type="number" inputMode="decimal" value={adsFee}
                        onChange={e => setAdsFee(e.target.value)}
                        style={{ width: 90, textAlign: 'center', padding: '8px', border: '2px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, marginTop: 8 }}
                      />
                    )}
                  />

                  {/* Coupon */}
                  <ToggleRow
                    checked={couponEnabled}
                    onToggle={() => setCouponEnabled(v => !v)}
                    label="คูปองส่วนลด"
                    sub="ร้านออกให้ลูกค้า"
                    amount={couponEnabled && couponAmount ? `-${fmt(Number(couponAmount) || 0)} ฿` : null}
                    extra={couponEnabled && (
                      <input
                        type="number" inputMode="decimal" placeholder="จำนวนเงินส่วนลด" value={couponAmount}
                        onChange={e => setCouponAmount(e.target.value)}
                        style={{ width: 160, padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, marginTop: 8 }}
                        autoFocus
                      />
                    )}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="card" style={{ marginBottom: 20, border: '2px solid #FF6B35' }}>
                <div className="card-body">
                  <Row label="ราคาขายรวม" value={`${fmt(calc.subtotal)} ฿`} />
                  {calc.gpAmount > 0 && <Row label={`GP ${calc.gpPercent}%`} value={`-${fmt(calc.gpAmount)} ฿`} danger />}
                  {calc.ads > 0 && <Row label="ค่า Ads" value={`-${fmt(calc.ads)} ฿`} danger />}
                  {calc.coupon > 0 && <Row label="คูปองส่วนลด" value={`-${fmt(calc.coupon)} ฿`} danger />}
                  <Row label="เงินเข้าร้าน" value={`${fmt(calc.netReceived)} ฿`} bold />
                  <Row label="ต้นทุนวัตถุดิบ" value={`-${fmt(calc.totalCost)} ฿`} danger />
                  <div className="divider" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-bold">กำไรสุทธิ</span>
                    <strong className={calc.netProfit >= 0 ? 'text-success' : 'text-danger'} style={{ fontSize: '1.5rem' }}>{fmt(calc.netProfit)} ฿</strong>
                  </div>
                </div>
              </div>

              {menusWithoutRecipe && (
                <div className="alert alert-warning" style={{ borderRadius: 10, marginBottom: 12 }}>
                  <span className="text-sm">⚠ มีเมนูที่ยังไม่ได้ตั้งสูตร ต้นทุนจะคิดเป็น 0 — แนะนำตั้งสูตรในหน้าเมนูก่อน</span>
                </div>
              )}

              <button className="btn btn-success btn-lg btn-full" onClick={handleSave}>
                <CheckCircle size={22} /> บันทึกออเดอร์
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Row({ label, value, danger, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span className={bold ? 'font-semibold' : 'text-muted'} style={{ fontSize: '0.92rem' }}>{label}</span>
      <strong className={danger ? 'text-danger' : ''} style={{ fontWeight: bold ? 700 : 600 }}>{value}</strong>
    </div>
  )
}

function ToggleRow({ checked, onToggle, label, sub, amount, extra }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggle}
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            border: '2px solid', borderColor: checked ? '#FF6B35' : '#d1d5db',
            background: checked ? '#FF6B35' : 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            fontSize: '1rem', fontWeight: 700,
          }}
        >
          {checked ? '✓' : ''}
        </button>
        <div style={{ flex: 1 }} onClick={onToggle}>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted">{sub}</div>
        </div>
        {amount && <strong className="text-danger text-sm">{amount}</strong>}
      </div>
      {extra}
    </div>
  )
}
