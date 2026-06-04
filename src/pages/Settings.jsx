import { useState, useEffect } from 'react'
import { useShop } from '../lib/shopContext'
import { channelDb } from '../lib/db'
import { Plus, Pencil, Trash2, Truck, X } from 'lucide-react'

const EMPTY = { name: '', gpPercent: '', adsDefault: '' }

export default function Settings({ onClose }) {
  const { currentShop } = useShop()
  const [channels, setChannels] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editCh, setEditCh] = useState(null)
  const [form, setForm] = useState(EMPTY)

  function load() {
    setChannels(channelDb.getAll(currentShop.id))
  }
  useEffect(() => { load() }, [currentShop.id])

  function openAdd() {
    setEditCh(null); setForm(EMPTY); setShowForm(true)
  }
  function openEdit(ch) {
    setEditCh(ch)
    setForm({ name: ch.name, gpPercent: ch.gpPercent, adsDefault: ch.adsDefault })
    setShowForm(true)
  }
  function handleSave() {
    if (!form.name.trim()) return
    if (editCh) {
      channelDb.update(currentShop.id, editCh.id, {
        name: form.name.trim(),
        gpPercent: Number(form.gpPercent || 0),
        adsDefault: Number(form.adsDefault || 0),
      })
    } else {
      channelDb.add(currentShop.id, form)
    }
    load(); setShowForm(false)
  }
  function handleDelete(id) {
    channelDb.delete(currentShop.id, id)
    load()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ตั้งค่าช่องทางขาย</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-muted mb-4">กำหนด GP% และค่า Ads เริ่มต้นของแต่ละช่องทาง (ปรับได้ตอนเปิดออเดอร์)</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.map(ch => (
              <div key={ch.id} className="card" style={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Truck size={20} color="#FF6B35" />
                  <div style={{ flex: 1 }}>
                    <div className="font-semibold">{ch.name}</div>
                    <div className="text-xs text-muted">GP {ch.gpPercent}% · Ads {ch.adsDefault} ฿/ออเดอร์</div>
                  </div>
                  <button className="btn btn-icon btn-secondary" onClick={() => openEdit(ch)}><Pencil size={15} /></button>
                  <button className="btn btn-icon btn-danger" onClick={() => handleDelete(ch.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-outline btn-full mt-4" onClick={openAdd}>
            <Plus size={18} /> เพิ่มช่องทาง
          </button>

          {showForm && (
            <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
              <div className="form-group">
                <label className="form-label">ชื่อช่องทาง *</label>
                <input className="form-control" placeholder="เช่น Grab, Robinhood" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">GP %</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="0" value={form.gpPercent} onChange={e => setForm(f => ({ ...f, gpPercent: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ads เริ่มต้น (฿)</label>
                  <input className="form-control" type="number" inputMode="decimal" placeholder="0" value={form.adsDefault} onChange={e => setForm(f => ({ ...f, adsDefault: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>ยกเลิก</button>
                <button className="btn btn-primary flex-1" onClick={handleSave}>บันทึก</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
