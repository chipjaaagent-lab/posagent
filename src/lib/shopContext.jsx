import { createContext, useContext, useState, useEffect } from 'react'
import { shopDb } from './db'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [shops, setShops] = useState([])
  const [currentShop, setCurrentShop] = useState(null)

  useEffect(() => {
    const all = shopDb.getAll()
    setShops(all)
    const lastId = localStorage.getItem('rcm_last_shop')
    if (lastId) {
      const found = all.find(s => s.id === lastId)
      if (found) setCurrentShop(found)
    }
  }, [])

  function selectShop(shop) {
    setCurrentShop(shop)
    localStorage.setItem('rcm_last_shop', shop.id)
  }

  function addShop(name, emoji) {
    const shop = shopDb.add(name, emoji)
    setShops(shopDb.getAll())
    return shop
  }

  function updateShop(id, data) {
    shopDb.update(id, data)
    const updated = shopDb.getAll()
    setShops(updated)
    if (currentShop?.id === id) setCurrentShop(updated.find(s => s.id === id))
  }

  function refreshShops() {
    setShops(shopDb.getAll())
  }

  return (
    <ShopContext.Provider value={{ shops, currentShop, selectShop, addShop, updateShop, refreshShops }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}
