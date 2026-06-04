import { AuthProvider, useAuth } from './lib/authContext'
import { ShopProvider, useShop } from './lib/shopContext'
import Login from './pages/Login'
import ShopSelector from './pages/ShopSelector'
import MainApp from './pages/MainApp'

function AppInner() {
  const { user, loading: authLoading } = useAuth()
  const { currentShop, loading: shopLoading } = useShop()

  if (authLoading || shopLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#FF6B35' }}>
        <div style={{ fontSize: 56 }}>🍕</div>
        <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>POSAgent</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>กำลังโหลด...</div>
      </div>
    )
  }

  if (!user) return <Login />
  if (!currentShop) return <ShopSelector />
  return <MainApp />
}

export default function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <AppInner />
      </ShopProvider>
    </AuthProvider>
  )
}
