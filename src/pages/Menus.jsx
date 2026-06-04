import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { menuDb, ingredientDb } from '../lib/db'
import { Plus, Pencil, Trash2, UtensilsCrossed, ChevronDown, ChevronUp, X } from 'lucide-react'

function fmt(n) {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SIZES = ['', '6 นิ้ว', '7 นิ้ว', '8 นิ้ว', '9 นิ้ว', '10 นิ้ว', '12 นิ้ว', 'S', 'M', 'L']

const EMPTY_FORM = { name: '', size: '', sellingPrice: '', note: '', recipe: [] }

export default function Menus() {
  const { currentShop } = useShop()
  const [menus, setMenus] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editMenu, setEditMenu] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  // add-ingredient-to-recipe inputs
  const [addIngId, setAddIngId] = useState('')
  const [addQty, setAddQty] = useState('')

  function load() {
    setMenus(menuDb.getAll(currentShop.id))
    setIngredients(ingredientDb.getAll(currentShop.id))
  }

  useEffect(() => { load() }, [currentShop.id])

  function openAdd() {
    setEditMenu(null)
    setForm(EMPTY_FORM)
    setAddIngId(''); setAddQty('')
    setShowForm(true)
  }

  function openEdit(menu) {
    setEditMenu(menu)
    setForm({
      name: menu.name,
      size: menu.size || '',
      sellingPrice: menu.sellingPrice,
      note: menu.note || '',
      recipe: (menu.latestRecipe || []).map(r => ({ ...r })),
    })
    setAddIngId(''); setAddQty('')
    setShowForm(true)
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

  function updateRecipeQty(ingredientId, val) {
    setForm(f => ({ ...f, recipe: f.recipe.map(r => r.ingredientId === ingredientId ? { ...r, qty: val } : r) }))
  }

  function removeFromRecipe(ingredientId) {
    setForm(f => ({ ...f, recipe: f.recipe.filter(r => r.ingredientId !== ingredientId) }))
  }

  function handleSave() {
    if (!form.name.trim() || !form.sellingPrice) return
    const cleanRecipe = form.recipe
      .filter(r => Number(r.qty) > 0)
      .map(r => ({ ingredientId: r.ingredientId, qty: Number(r.qty), unitType: r.unitType }))
    const data = {
      name: form.name.trim(),
      size: form.size,
      sellingPrice: Number(form.sellingPrice),
      note: form.note,
      latestRecipe: cleanRecipe,
    }
    if (editMenu) {
      menuDb.update(currentShop.id, editMenu.id, data)
    } else {
      menuDb.add(currentShop.id, data)
    }
    load()
    setShowForm(false)
  }

  function handleDelete(id) {
    menuDb.delete(currentShop.id, id)
    load()
    setDeleteConfirm(null)
  }

  function ingName(id) {
    return ingredients.find(i => i.id === id)?.name || '(วัตถุดิบถูกลบ)'
  }
  function ingCost(id) {
    return ingredients.find(i => i.id === id)?.costPerUnit || 0
  }

  function calcRecipeCost(recipe) {
    return (recipe || []).reduce((sum, r) => sum + ingCost(r.ingredientId) * Number(r.qty), 0)
  }

  // live cost in form
  const formCost = calcRecipeCost(form.recipe)
  const formProfit = (Number(form.sellingPrice) || 0) - formCost

  return (
    <div className="page">
      <div className="page-header">
        <h1>เมนู</h1>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={20} /></button>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">
          <UtensilsCrossed size={48} />
          <p className="font-semibold mt-2">ยังไม่มีเมนู</p>
          <p className="text-sm mt-1">กดปุ่ม + เพื่อเพิ่มเมนูและตั้งสูตร</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {menus.map(menu => {
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
                        <span className="text-sm">ราคาขาย: <strong className="text-primary">{fmt(menu.sellingPrice)} ฿</strong></span>
                        {hasRecipe && <span className="text-sm">ต้นทุน: <strong className="text-danger">{fmt(recipeCost)} ฿</strong></span>}
                        {hasRecipe && <span className="text-sm">กำไรวัตถุดิบ: <strong className="text-success">{fmt(profit)} ฿</strong></span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-icon btn-secondary" onClick={() => openEdit(menu)}><Pencil size={16} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => setDeleteConfirm(menu)}><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {hasRecipe && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : menu.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginTop: 10, padding: 0 }}
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      ดูสูตร ({menu.latestRecipe.length} รายการ)
                    </button>
                  )}
                </div>

                {expanded && hasRecipe && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px', background: '#fafafa' }}>
                    {menu.latestRecipe.map((r, i) => {
                      const cost = ingCost(r.ingredientId) * Number(r.qty)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < menu.latestRecipe.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <span className="text-sm">{ingName(r.ingredientId)}</span>
                          <span className="text-sm text-muted">{r.qty} {r.unitType === 'gram' ? 'ก.' : 'ชิ้น'} = <strong>{fmt(cost)} ฿</strong></span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMenu ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">ชื่อเมนู *</label>
                <input className="form-control" placeholder="เช่น ฮาวายเอี้ยน" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ขนาด</label>
                  <select className="form-control" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                    {SIZES.map(s => <option key={s} value={s}>{s || '— ไม่ระบุ —'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ราคาขาย *</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="บาท" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
                </div>
              </div>

              {/* Recipe editor */}
              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1rem' }}>สูตร (วัตถุดิบที่ใช้)</h3>
                <span className="text-xs text-muted">ตั้งครั้งเดียว ใช้ตลอด</span>
              </div>

              {ingredients.length === 0 ? (
                <div className="alert alert-warning" style={{ borderRadius: 10, marginBottom: 12 }}>
                  <span className="text-sm">ยังไม่มีวัตถุดิบ กรุณาเพิ่มวัตถุดิบก่อน</span>
                </div>
              ) : (
                <>
                  {form.recipe.length > 0 && (
                    <div className="card" style={{ marginBottom: 12, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                      {form.recipe.map((r, idx) => {
                        const cost = ingCost(r.ingredientId) * Number(r.qty || 0)
                        const ing = ingredients.find(i => i.id === r.ingredientId)
                        return (
                          <div key={r.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: idx < form.recipe.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ flex: 1 }}>
                              <div className="text-sm font-semibold">{ingName(r.ingredientId)}</div>
                              <div className="text-xs text-muted">{fmt(ingCost(r.ingredientId))} ฿/{ing?.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</div>
                            </div>
                            <input
                              type="number" inputMode="decimal" value={r.qty}
                              onChange={e => updateRecipeQty(r.ingredientId, e.target.value)}
                              style={{ width: 70, textAlign: 'center', padding: '8px 4px', border: '2px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700 }}
                            />
                            <span className="text-xs text-muted" style={{ width: 28 }}>{ing?.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</span>
                            <span className="text-sm font-semibold" style={{ width: 64, textAlign: 'right' }}>{fmt(cost)} ฿</span>
                            <button onClick={() => removeFromRecipe(r.ingredientId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4 }}><X size={16} /></button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add ingredient row */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <select className="form-control" style={{ flex: 2 }} value={addIngId} onChange={e => setAddIngId(e.target.value)}>
                      <option value="">— เลือกวัตถุดิบ —</option>
                      {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input className="form-control" type="number" inputMode="decimal" placeholder={ingredients.find(i => i.id === addIngId)?.unitType === 'gram' ? 'กรัม' : 'ชิ้น'} value={addQty} onChange={e => setAddQty(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <button className="btn btn-primary btn-icon" onClick={addToRecipe} style={{ minWidth: 52 }}><Plus size={18} /></button>
                  </div>

                  {/* Live cost summary */}
                  {form.recipe.length > 0 && (
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="text-sm text-muted">ต้นทุนวัตถุดิบรวม</span>
                        <strong className="text-danger">{fmt(formCost)} ฿</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-sm font-semibold">กำไรวัตถุดิบ (ก่อนหัก GP)</span>
                        <strong className={formProfit >= 0 ? 'text-success' : 'text-danger'}>{fmt(formProfit)} ฿</strong>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">หมายเหตุ</label>
                <input className="form-control" placeholder="ไม่บังคับ" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button className="btn btn-primary flex-1" onClick={handleSave}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <h2>ลบเมนู?</h2>
              <p className="text-muted mt-2">"{deleteConfirm.name}" และสูตรจะถูกลบออก</p>
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
