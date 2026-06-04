import { createContext, useContext, useState, useEffect } from 'react'
import { shopDb } from './db'
import { useAuth } from './authContext'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const { user } = useAuth()
  const [shops, setShops] = useState([])
  const [currentShop, setCurrentShop] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadShops()
    } else {
      setShops([])
      setCurrentShop(null)
      setLoading(false)
    }
  }, [user])

  async function loadShops() {
    setLoading(true)
    try {
      const all = await shopDb.getAll()
      setShops(all)
      const lastId = localStorage.getItem('posagent_last_shop')
      if (lastId) {
        const found = all.find(s => s.id === lastId)
        if (found) setCurrentShop(found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function selectShop(shop) {
    setCurrentShop(shop)
    if (shop) localStorage.setItem('posagent_last_shop', shop.id)
    else localStorage.removeItem('posagent_last_shop')
  }

  async function addShop(name, emoji) {
    const shop = await shopDb.add(name, emoji)
    await loadShops()
    return shop
  }

  async function updateShop(id, data) {
    await shopDb.update(id, data)
    await loadShops()
  }

  async function refreshShops() {
    await loadShops()
  }

  return (
    <ShopContext.Provider value={{ shops, currentShop, loading, selectShop, addShop, updateShop, refreshShops }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}
