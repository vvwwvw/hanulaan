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

function saveCache(user: User) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(user)) } catch {}
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
  const { data } = await supabase.from('users').select('*').eq('email', email).single()
  if (data) {
    saveCache(data as User)
    return data as User
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!session?.user) {
          // 세션 없음 → 로그인 필요
          setLoading(false)
          return
        }

        // 캐시된 프로필 있으면 즉시 로드 (새로고침 시 빠른 렌더)
        const cached = loadCache()
        if (cached && cached.email === session.user.email) {
          setUser(cached)
          setLoading(false)
          // 백그라운드에서 최신 프로필로 갱신
          fetchProfile(session.user.email!).then(p => { if (p) setUser(p) })
        } else {
          // 캐시 없으면 DB에서 로드
          try {
            const profile = await fetchProfile(session.user.email!)
            if (profile) setUser(profile)
          } finally {
            setLoading(false)
          }
        }

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
