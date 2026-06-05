import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, ALLOWED_EMAIL } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleSession(session) {
    if (!session) {
      setUser(null)
      setDenied(false)
      return
    }
    const email = session.user?.email
    if (email === ALLOWED_EMAIL) {
      setUser(session.user)
      setDenied(false)
    } else {
      // ไม่ใช่ email ที่อนุญาต → logout ทันที
      supabase.auth.signOut()
      setUser(null)
      setDenied(true)
    }
  }

  async function signInWithGoogle() {
    setDenied(false)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, denied, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
