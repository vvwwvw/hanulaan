'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  sessionReady: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)
const CACHE_KEY = 'hanulaan_user'

function saveCache(u: User) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(u)) } catch {}
}
function loadCache(): User | null {
  try {
    const s = localStorage.getItem(CACHE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

async function fetchProfile(email: string): Promise<User | null> {
  try {
    const { data } = await supabase.from('users').select('*').eq('email', email).single()
    if (data) { saveCache(data as User); return data as User }
    return null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadCache())
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let mounted = true

    // 안전장치: 8초 후에도 loading이면 강제 해제
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          const profile = await fetchProfile(session.user.email!)
          if (mounted && profile) setUser(profile)
          if (mounted) setSessionReady(true)
        } else {
          clearCache()
          if (mounted) { setUser(null); setSessionReady(false) }
        }
        if (mounted) setLoading(false)
        clearTimeout(timeout)

      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          const profile = await fetchProfile(session.user.email!)
          if (mounted && profile) { setUser(profile); setSessionReady(true) }
        }
        if (mounted) setLoading(false)

      } else if (event === 'TOKEN_REFRESHED') {
        if (mounted) setSessionReady(true)

      } else if (event === 'SIGNED_OUT') {
        clearCache()
        if (mounted) { setUser(null); setSessionReady(false); setLoading(false) }
      }
    })

    return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signOut() {
    clearCache()
    setUser(null)
    setSessionReady(false)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionReady, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
