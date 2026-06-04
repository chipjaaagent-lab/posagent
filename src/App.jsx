import { useState } from 'react'
import { ShopProvider, useShop } from './lib/shopContext'
import ShopSelector from './pages/ShopSelector'
import MainApp from './pages/MainApp'

function AppInner() {
  const { currentShop } = useShop()
  if (!currentShop) return <ShopSelector />
  return <MainApp />
}

export default function App() {
  return (
    <ShopProvider>
      <AppInner />
    </ShopProvider>
  )
}
