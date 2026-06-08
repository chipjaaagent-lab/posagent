import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { menuDb, ingredientDb } from '../lib/db'
import { Plus, Pencil, Copy, Trash2, UtensilsCrossed, ChevronDown, ChevronUp, X } from 'lucide-react'

function fmt(n) { return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const SIZES = ['', '5 นิ้ว (S)', '7 นิ้ว (M)', '9 นิ้ว (L)']
const MENU_TYPES = ['พิซซ่า', 'ทอปปิ้งเสริม', 'เครื่องดื่ม', 'อื่นๆ']
const EMPTY_FORM = { name: '', menuType: 'พิซซ่า', size: '', sellingPrice: '', note: '', recipe: [] }

export default function Menus() {
  const { currentShop } = useShop()
  const [menus, setMenus] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editMenu, setEditMenu] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [addIngId, setAddIngId] = useState('')
  const [addQty, setAddQty] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [m, i] = await Promise.all([menuDb.getAll(currentShop.id), ingredientDb.getAll(currentShop.id)])
      setMenus(m); setIngredients(i)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentShop.id])

  function openAdd() { setEditMenu(null); setForm(EMPTY_FORM); setAddIngId(''); setAddQty(''); setShowForm(true) }
  function openEdit(menu) {
    setEditMenu(menu)
    setForm({ name: menu.name, menuType: menu.menuType || 'พิซซ่า', size: menu.size || '', sellingPrice: menu.sellingPrice, note: menu.note || '', recipe: (menu.latestRecipe || []).map(r => ({ ...r })) })
    setAddIngId(''); setAddQty(''); setShowForm(true)
  }
  function openDuplicate(menu) {
    setEditMenu(null)
    setForm({ name: `${menu.name} (สำเนา)`, menuType: menu.menuType || 'พิซซ่า', size: menu.size || '', sellingPrice: menu.sellingPrice, note: menu.note || '', recipe: (menu.latestRecipe || []).map(r => ({ ...r })) })
    setAddIngId(''); setAddQty(''); setShowForm(true)
  }

  function addToRecipe() {
    if (!addIngId || !addQty) return
    const ing = ingredients.find(i => i.id === addIngId)
    if (!ing) return
    setForm(f => {
      const exists = f.recipe.find(r => r.ingredientId === addIngId)
      const recipe = exists
        ? f.recipe.map(r => r.ingredientId === addIngId ? { ...r, qty: Number(addQty) } : r)
        : [...f.recipe, { ingredientId: addIngId, qty: Number(addQty), unitType: ing.unitType }]
      return { ...f, recipe }
    })
    setAddIngId(''); setAddQty('')
  }

  function ingCost(id) { return ingredients.find(i => i.id === id)?.costPerUnit || 0 }
  function ingName(id) { return ingredients.find(i => i.id === id)?.name || '(ถูกลบ)' }
  function calcRecipeCost(recipe) { return (recipe || []).reduce((s, r) => s + ingCost(r.ingredientId) * Number(r.qty), 0) }

  const formCost = calcRecipeCost(form.recipe)
  const formProfit = (Number(form.sellingPrice) || 0) - formCost

  async function handleSave() {
    if (!form.name.trim() || !form.sellingPrice) return
    setSaving(true)
    try {
      const data = { name: form.name.trim(), menuType: form.menuType, size: form.size, sellingPrice: Number(form.sellingPrice), note: form.note, latestRecipe: form.recipe.filter(r => Number(r.qty) > 0).map(r => ({ ingredientId: r.ingredientId, qty: Number(r.qty), unitType: r.unitType })) }
      if (editMenu) await menuDb.update(currentShop.id, editMenu.id, data)
      else await menuDb.add(currentShop.id, data)
      await load(); setShowForm(false)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await menuDb.delete(currentShop.id, id); await load() }
    catch(e) { console.error(e) }
    setDeleteConfirm(null)
  }

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>เมนู</h1>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={20} /></button>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state"><UtensilsCrossed size={48} /><p className="font-semibold mt-2">ยังไม่มีเมนู</p><p className="text-sm mt-1">กดปุ่ม + เพื่อเพิ่มเมนูและตั้งสูตร</p></div>
      ) : (
        [...MENU_TYPES, ...['__other__']].map(type => {
          const list = type === '__other__'
            ? menus.filter(m => !MENU_TYPES.includes(m.menuType))
            : menus.filter(m => (m.menuType || 'พิซซ่า') === type)
          if (list.length === 0) return null
          const label = type === '__other__' ? 'อื่นๆ' : type
          return (
        <div key={type} style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            {label} <span className="badge badge-gray">{list.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(menu => {
            const expanded = expandedId === menu.id
            const recipeCost = calcRecipeCost(menu.latestRecipe || [])
            const profit = menu.sellingPrice - recipeCost
            const hasRecipe = menu.latestRecipe?.length > 0
            return (
              <div key={menu.id} className="card">
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span className="font-semibold" style={{ fontSize: '1.05rem' }}>{menu.name}</span>
                        {menu.size && <span className="badge badge-gray">{menu.size}</span>}
                        {!hasRecipe && <span className="badge badge-warning">ยังไม่มีสูตร</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span className="text-sm">ราคา: <strong className="text-primary">{fmt(menu.sellingPrice)} ฿</strong></span>
                        {hasRecipe && <><span className="text-sm">ต้นทุน: <strong className="text-danger">{fmt(recipeCost)} ฿</strong></span><span className="text-sm">กำไร: <strong className="text-success">{fmt(profit)} ฿</strong></span></>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-icon btn-secondary" onClick={() => openEdit(menu)}><Pencil size={16} /></button>
                      <button className="btn btn-icon btn-secondary" onClick={() => openDuplicate(menu)}><Copy size={16} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => setDeleteConfirm(menu)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {hasRecipe && (
                    <button onClick={() => setExpandedId(expanded ? null : menu.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginTop: 10, padding: 0 }}>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} ดูสูตร ({menu.latestRecipe.length} รายการ)
                    </button>
                  )}
                </div>
                {expanded && hasRecipe && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px', background: '#fafafa' }}>
                    {menu.latestRecipe.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < menu.latestRecipe.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <span className="text-sm">{ingName(r.ingredientId)}</span>
                        <span className="text-sm text-muted">{r.qty} {r.unitType === 'gram' ? 'ก.' : 'ชิ้น'} = <strong>{fmt(ingCost(r.ingredientId) * r.qty)} ฿</strong></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
          )
        })
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMenu ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">ชื่อเมนู *</label><input className="form-control" placeholder="เช่น ฮาวายเอี้ยน" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
              <div className="form-group">
                <label className="form-label">ประเภท *</label>
                <select className="form-control" value={form.menuType} onChange={e => setForm(f => ({ ...f, menuType: e.target.value }))}>
                  {MENU_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">ขนาด</label><select className="form-control" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>{SIZES.map(s => <option key={s} value={s}>{s || '— ไม่ระบุ —'}</option>)}</select></div>
                <div className="form-group"><label className="form-label">ราคาขาย *</label><input className="form-control" type="number" inputMode="decimal" placeholder="บาท" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} /></div>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h3 style={{ fontSize: '1rem' }}>สูตร</h3><span className="text-xs text-muted">ตั้งครั้งเดียว ใช้ตลอด</span></div>
              {form.recipe.length > 0 && (
                <div className="card" style={{ marginBottom: 12, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                  {form.recipe.map((r, idx) => {
                    const cost = ingCost(r.ingredientId) * Number(r.qty || 0)
                    const ing = ingredients.find(i => i.id === r.ingredientId)
                    return (
                      <div key={r.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: idx < form.recipe.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <div style={{ flex: 1 }}><div className="text-sm font-semibold">{ingName(r.ingredientId)}</div><div className="text-xs text-muted">{fmt(ingCost(r.ingredientId))} ฿/{ing?.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</div></div>
                        <input type="number" inputMode="decimal" value={r.qty} onChange={e => setForm(f => ({ ...f, recipe: f.recipe.map(x => x.ingredientId === r.ingredientId ? { ...x, qty: e.target.value } : x) }))} style={{ width: 70, textAlign: 'center', padding: '8px 4px', border: '2px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700 }} />
                        <span className="text-xs text-muted" style={{ width: 28 }}>{ing?.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</span>
                        <span className="text-sm font-semibold" style={{ width: 64, textAlign: 'right' }}>{fmt(cost)} ฿</span>
                        <button onClick={() => setForm(f => ({ ...f, recipe: f.recipe.filter(x => x.ingredientId !== r.ingredientId) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4 }}><X size={16} /></button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select className="form-control" style={{ flex: 2 }} value={addIngId} onChange={e => setAddIngId(e.target.value)}>
                  <option value="">— เลือกวัตถุดิบ —</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input className="form-control" type="number" inputMode="decimal" placeholder={ingredients.find(i => i.id === addIngId)?.unitType === 'gram' ? 'กรัม' : 'ชิ้น'} value={addQty} onChange={e => setAddQty(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <button className="btn btn-primary btn-icon" onClick={addToRecipe} style={{ minWidth: 52 }}><Plus size={18} /></button>
              </div>
              {form.recipe.length > 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span className="text-sm text-muted">ต้นทุนวัตถุดิบรวม</span><strong className="text-danger">{fmt(formCost)} ฿</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-sm font-semibold">กำไรวัตถุดิบ (ก่อนหัก GP)</span><strong className={formProfit >= 0 ? 'text-success' : 'text-danger'}>{fmt(formProfit)} ฿</strong></div>
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}><label className="form-label">หมายเหตุ</label><input className="form-control" placeholder="ไม่บังคับ" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div><h2>ลบเมนู?</h2><p className="text-muted mt-2">"{deleteConfirm.name}"</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
              <button className="btn btn-danger flex-1" onClick={() => handleDelete(deleteConfirm.id)}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
