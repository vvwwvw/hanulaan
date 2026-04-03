'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
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

// DB 쿼리에 타임아웃 적용 (5초)
async function fetchProfile(email: string): Promise<User | null> {
  const query = supabase.from('users').select('*').eq('email', email).single()
    .then(({ data }) => (data ? (data as User) : null))
    .catch(() => null)

  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))

  const result = await Promise.race([query, timeout])
  if (result) saveCache(result)
  return result
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === 'INITIAL_SESSION') {
        if (!session?.user) {
          setLoading(false)
          return
        }

        // 캐시 있으면 즉시 렌더 (새로고침 시 스피너 없음)
        const cached = loadCache()
        if (cached && cached.email === session.user.email) {
          setUser(cached)
          setLoading(false)
          // 백그라운드 갱신
          fetchProfile(session.user.email!).then(p => { if (p) setUser(p) })
          return
        }

        // 캐시 없으면 DB에서 로드 (최대 5초)
        const profile = await fetchProfile(session.user.email!)
        if (profile) setUser(profile)
        setLoading(false)

      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          const profile = await fetchProfile(session.user.email!)
          if (profile) setUser(profile)
        }
      } else if (event === 'SIGNED_OUT') {
        clearCache()
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    clearCache()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
