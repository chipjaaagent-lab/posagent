import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { ingredientDb } from '../lib/db'
import { Plus, Pencil, Trash2, AlertTriangle, Package, Search, Layers } from 'lucide-react'

const UNIT_LABELS = { gram: 'กรัม', piece: 'ชิ้น', fixed_cost: 'ต่อถาด (fixed)' }
const CATEGORIES = ['', 'แป้งและบรรจุภัณฑ์', 'ทอปปิ้ง', 'ซอส', 'ชีส', 'เครื่องดื่ม']

function fmt(n, d = 2) {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d })
}

const EMPTY = { name: '', category: '', unitType: 'gram', purchaseQty: '', purchasePrice: '', stock: '', lowStockThreshold: '', note: '', purchaseDate: '' }

export default function Ingredients() {
  const { currentShop } = useShop()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [restockItem, setRestockItem] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [isAddMode, setIsAddMode] = useState(true)

  async function load() {
    setLoading(true)
    try { setItems(await ingredientDb.getAll(currentShop.id)) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentShop.id])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setEditItem(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, category: item.category || '', unitType: item.unitType, purchaseQty: item.purchaseQty, purchasePrice: item.purchasePrice, stock: item.stock, lowStockThreshold: item.lowStockThreshold || '', note: item.note || '', purchaseDate: item.purchaseDate || '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.purchaseQty || !form.purchasePrice) return
    setSaving(true)
    try {
      const data = { ...form, purchaseQty: Number(form.purchaseQty), purchasePrice: Number(form.purchasePrice), stock: form.stock !== '' ? Number(form.stock) : Number(form.purchaseQty), lowStockThreshold: Number(form.lowStockThreshold || 0) }
      if (editItem) {
        await ingredientDb.update(currentShop.id, editItem.id, { ...data, _purchaseQty: data.purchaseQty, _purchasePrice: data.purchasePrice })
      } else {
        await ingredientDb.add(currentShop.id, data)
      }
      await load()
      setShowForm(false)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await ingredientDb.delete(currentShop.id, id); await load() }
    catch(e) { console.error(e) }
    setDeleteConfirm(null)
  }

  function openRestock(item) {
    setRestockItem(item)
    setRestockQty('')
    setIsAddMode(true)
  }

  async function handleSaveRestock() {
    if (!restockItem || restockQty === '') return
    setSaving(true)
    try {
      const inputVal = Number(restockQty)
      const currentStock = Number(restockItem.stock || 0)
      const newStock = isAddMode ? currentStock + inputVal : inputVal
      await ingredientDb.update(currentShop.id, restockItem.id, { stock: newStock })
      await load()
      setRestockItem(null)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const costPerUnit = form.purchaseQty && form.purchasePrice
    ? (Number(form.purchasePrice) / Number(form.purchaseQty)).toFixed(4) : null

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>วัตถุดิบ</h1>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={20} /></button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input className="form-control" style={{ paddingLeft: 42 }} placeholder="ค้นหาวัตถุดิบ..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p className="font-semibold mt-2">{search ? 'ไม่พบวัตถุดิบ' : 'ยังไม่มีวัตถุดิบ'}</p>
          <p className="text-sm mt-1">กดปุ่ม + เพื่อเพิ่มวัตถุดิบ</p>
        </div>
      ) : (
        <div className="card">
          {filtered.map((item, idx) => {
            const isLow = item.lowStockThreshold > 0 && item.stock <= item.lowStockThreshold
            return (
              <div key={item.id} className="list-item" style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openRestock(item)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="font-semibold">{item.name}</span>
                    {item.category && <span className="badge badge-gray">{item.category}</span>}
                    {isLow && <span className="badge badge-danger"><AlertTriangle size={10} /> ใกล้หมด</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">ต้นทุน: <strong className="text-primary">{fmt(item.costPerUnit, 4)} ฿/{item.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</strong></span>
                    <span className="text-sm text-muted">สต็อก: <strong style={{ color: isLow ? '#ef4444' : '#1f2937' }}>{fmt(item.stock, 0)} {item.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-icon btn-secondary" onClick={() => openRestock(item)} title="Restock สต็อกด่วน"><Layers size={16} /></button>
                  <button className="btn btn-icon btn-secondary" onClick={() => openEdit(item)} title="แก้ไขทั้งหมด"><Pencil size={16} /></button>
                  <button className="btn btn-icon btn-danger" onClick={() => setDeleteConfirm(item)} title="ลบวัตถุดิบ"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">ชื่อวัตถุดิบ *</label>
                <input className="form-control" placeholder="เช่น ชีสมอสซาเรลล่า" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">หมวดหมู่</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c || '— ไม่ระบุ —'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">หน่วย *</label>
                  <select className="form-control" value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))}>
                    <option value="gram">กรัม</option>
                    <option value="piece">ชิ้น</option>
                    <option value="fixed_cost">ต้นทุนคงที่/ถาด</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">จำนวนที่ซื้อ *</label>
                  <input className="form-control" type="number" inputMode="decimal" value={form.purchaseQty} onChange={e => setForm(f => ({ ...f, purchaseQty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">ราคาที่ซื้อ *</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="บาท" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
                </div>
              </div>
              {costPerUnit && (
                <div className="alert alert-success" style={{ borderRadius: 10, marginBottom: 16 }}>
                  <strong>ต้นทุนต่อหน่วย: {costPerUnit} ฿/{form.unitType === 'gram' ? 'กรัม' : 'ชิ้น'}</strong>
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">สต็อกปัจจุบัน</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="ปล่อยว่าง = ซื้อมาทั้งหมด" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">แจ้งเตือนเมื่อเหลือ</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="0 = ไม่แจ้ง" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">วันที่ซื้อ</label>
                <input className="form-control" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">หมายเหตุ</label>
                <input className="form-control" placeholder="ไม่บังคับ" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
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
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <h2>ลบวัตถุดิบ?</h2>
              <p className="text-muted mt-2">"{deleteConfirm.name}" จะถูกลบออกจากระบบ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
              <button className="btn btn-danger flex-1" onClick={() => handleDelete(deleteConfirm.id)}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      {restockItem && (
        <div className="modal-overlay" onClick={() => setRestockItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Restock: {restockItem.name}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setRestockItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
                <button 
                  className="flex-1 btn" 
                  style={{ 
                    background: isAddMode ? '#3b82f6' : 'transparent',
                    color: isAddMode ? '#fff' : '#4b5563',
                    border: 'none',
                    boxShadow: isAddMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: 'bold',
                    padding: '12px 0',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsAddMode(true)}
                >
                  ➕ บวกเพิ่มจากของเดิม
                </button>
                <button 
                  className="flex-1 btn" 
                  style={{ 
                    background: !isAddMode ? '#10b981' : 'transparent',
                    color: !isAddMode ? '#fff' : '#4b5563',
                    border: 'none',
                    boxShadow: !isAddMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: 'bold',
                    padding: '12px 0',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsAddMode(false)}
                >
                  🔄 นับใหม่แทนที่ของเดิม
                </button>
              </div>

              <div className="form-group" style={{ textAlign: 'center' }}>
                <label className="form-label" style={{ fontSize: '1.1rem', display: 'block', marginBottom: 8 }}>
                  สต็อกปัจจุบัน: <strong style={{ color: '#2563eb' }}>{fmt(restockItem.stock, 0)} {restockItem.unitType === 'gram' ? 'ก.' : 'ชิ้น'}</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                  <input 
                    className="form-control" 
                    type="number" 
                    inputMode="decimal"
                    placeholder={isAddMode ? 'ใส่จำนวนที่ต้องการบวก' : 'ใส่จำนวนที่นับได้จริง'} 
                    style={{ fontSize: '1.8rem', height: 60, textAlign: 'center', maxWidth: 220 }} 
                    value={restockQty} 
                    onChange={e => setRestockQty(e.target.value)} 
                    autoFocus 
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4b5563' }}>
                    {restockItem.unitType === 'gram' ? 'กรัม' : 'ชิ้น'}
                  </span>
                </div>
                {restockQty && (
                  <div style={{ marginTop: 16, fontSize: '1.1rem', color: '#4b5563' }}>
                    สต็อกใหม่จะเป็น: <strong style={{ color: '#2563eb', fontSize: '1.3rem' }}>
                      {fmt(isAddMode 
                        ? (Number(restockItem.stock) + Number(restockQty)) 
                        : Number(restockQty), 0
                      )}
                    </strong> {restockItem.unitType === 'gram' ? 'กรัม' : 'ชิ้น'}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" style={{ padding: '14px 0', fontSize: '1.1rem' }} onClick={() => setRestockItem(null)}>ยกเลิก</button>
              <button className="btn btn-primary flex-1" style={{ padding: '14px 0', fontSize: '1.1rem' }} onClick={handleSaveRestock} disabled={saving || !restockQty}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกสต็อก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}
