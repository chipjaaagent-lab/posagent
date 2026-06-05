import { useState } from 'react'
import { useShop } from '../lib/shopContext'
import Dashboard from './Dashboard'
import Ingredients from './Ingredients'
import Menus from './Menus'
import NewOrder from './NewOrder'
import SalesHistory from './SalesHistory'
import Settings from './Settings'
import { LayoutDashboard, Package, UtensilsCrossed, ShoppingCart, History, LogOut, Settings as SettingsIcon, ShoppingBasket } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { id: 'ingredients', label: 'วัตถุดิบ', icon: Package },
  { id: 'order', label: 'เปิดออเดอร์', icon: ShoppingCart },
  { id: 'menus', label: 'เมนู', icon: UtensilsCrossed },
  { id: 'history', label: 'ประวัติ', icon: History },
]

export default function MainApp() {
  const [tab, setTab] = useState('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const { currentShop, selectShop } = useShop()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Top bar */}
      <div style={{
        background: '#FF6B35', color: 'white',
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{currentShop.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{currentShop.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/market"
            style={{ background: '#16a34a', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <ShoppingBasket size={18} />
          </a>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <SettingsIcon size={18} />
          </button>
          <button
            onClick={() => selectShop(null)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600 }}
          >
            <LogOut size={16} /> เปลี่ยนร้าน
          </button>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1 }}>
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'ingredients' && <Ingredients />}
        {tab === 'order' && <NewOrder />}
        {tab === 'menus' && <Menus />}
        {tab === 'history' && <SalesHistory />}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
