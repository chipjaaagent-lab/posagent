import { useState } from 'react'
import { useShop } from '../lib/shopContext'
import { useAuth } from '../lib/authContext'
import { Plus, ChevronRight, Pencil, LogOut } from 'lucide-react'

const EMOJIS = ['🍕', '🍜', '🍔', '🍣', '🥗', '🍱', '☕', '🧁']

export default function ShopSelector() {
  const { shops, selectShop, addShop, updateShop } = useShop()
  const { user, signOut } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editShop, setEditShop] = useState(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍕')
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setEditShop(null); setName(''); setEmoji('🍕'); setShowForm(true)
  }

  function openEdit(e, shop) {
    e.stopPropagation()
    setEditShop(shop); setName(shop.name); setEmoji(shop.emoji); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editShop) {
        await updateShop(editShop.id, { name: name.trim(), emoji })
        setShowForm(false)
      } else {
        const shop = await addShop(name.trim(), emoji)
        selectShop(shop)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #FF6B35 0%, #f5a16d 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40, color: 'white' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🍕</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>POSAgent</h1>
          <p style={{ opacity: 0.85, marginTop: 6 }}>เลือกร้านที่ต้องการจัดการ</p>
          <p style={{ opacity: 0.65, fontSize: '0.82rem', marginTop: 4 }}>{user?.email}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {shops.map(shop => (
            <button key={shop.id} onClick={() => selectShop(shop)} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: 'none', borderRadius: 16, padding: '18px 20px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transition: 'transform 0.15s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              <span style={{ fontSize: 36 }}>{shop.emoji}</span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>{shop.name}</span>
              <button onClick={e => openEdit(e, shop)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#9ca3af' }}>
                <Pencil size={18} />
              </button>
              <ChevronRight size={20} color="#9ca3af" />
            </button>
          ))}
        </div>

        <button onClick={openAdd} className="btn btn-lg btn-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px dashed rgba(255,255,255,0.5)', marginBottom: 16 }}>
          <Plus size={22} /> เพิ่มร้านใหม่
        </button>

        <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', fontSize: '0.9rem' }}>
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editShop ? 'แก้ไขร้าน' : 'เพิ่มร้านใหม่'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">ชื่อร้าน</label>
                <input className="form-control" placeholder="เช่น พิซซ่า 5 ดาว" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">ไอคอน</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 32, padding: 10, border: '2px solid', borderColor: emoji === e ? '#FF6B35' : '#e5e7eb', borderRadius: 12, cursor: 'pointer', background: emoji === e ? '#fff0eb' : 'white' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : editShop ? 'บันทึก' : 'สร้างร้าน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
