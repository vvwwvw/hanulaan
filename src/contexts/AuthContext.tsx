'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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

async function fetchProfile(email: string): Promise<User | null> {
  try {
    const { data } = await supabase.from('users').select('*').eq('email', email).single()
    if (data) { saveCache(data as User); return data as User }
    return null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const loadingDone = useRef(false)

  function finishLoading(u: User | null) {
    if (loadingDone.current) return
    loadingDone.current = true
    if (u) setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      // 1. 캐시가 있으면 즉시 렌더 (가장 빠름)
      const cached = loadCache()
      if (cached) {
        finishLoading(cached)
      }

      // 2. getSession을 3초 타임아웃으로 실행
      const session = await Promise.race([
        supabase.auth.getSession().then(r => r.data.session).catch(() => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ])

      if (!mounted) return

      if (!session?.user) {
        // 세션 없음 또는 타임아웃 → stale 세션 데이터 강제 삭제
        clearCache()
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key)
          })
        } catch {}
        setUser(null)
        finishLoading(null)
        return
      }

      // 세션 있음 → 캐시 이메일 확인
      if (cached && cached.email === session.user.email) {
        finishLoading(cached)
        // 백그라운드에서 최신 프로필 갱신
        fetchProfile(session.user.email!).then(p => {
          if (mounted && p) setUser(p)
        })
      } else {
        // 캐시 없거나 이메일 불일치 → DB에서 로드
        const profile = await fetchProfile(session.user.email!)
        if (mounted) finishLoading(profile)
      }
    }

    init()

    // 로그인/로그아웃 이벤트만 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.email!)
        if (mounted && profile) {
          setUser(profile)
          finishLoading(profile)
        }
      } else if (event === 'SIGNED_OUT') {
        clearCache()
        if (mounted) {
          setUser(null)
          loadingDone.current = true
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
