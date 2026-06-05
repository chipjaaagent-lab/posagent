import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/authContext'
import { ShopProvider, useShop } from './lib/shopContext'
import Login from './pages/Login'
import ShopSelector from './pages/ShopSelector'
import MainApp from './pages/MainApp'
import Market from './pages/Market'

function Loader() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#FF6B35' }}>
      <div style={{ fontSize: 56 }}>🍕</div>
      <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>POSAgent</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>กำลังโหลด...</div>
    </div>
  )
}

function MainFlow() {
  const { user, loading: authLoading } = useAuth()
  const { currentShop, loading: shopLoading } = useShop()
  if (authLoading || shopLoading) return <Loader />
  if (!user) return <Login />
  if (!currentShop) return <ShopSelector />
  return <MainApp />
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Login />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
          <Route path="*" element={<ShopProvider><MainFlow /></ShopProvider>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
