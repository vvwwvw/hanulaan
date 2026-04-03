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

// localStorage에서 Supabase 세션 직접 읽기 (네트워크 요청 없음)
function getLocalSession(): { email: string } | null {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    )
    if (!key) return null
    const data = JSON.parse(localStorage.getItem(key) || 'null')
    const email = data?.user?.email
    return email ? { email } : null
  } catch { return null }
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
  const initialized = useRef(false)

  useEffect(() => {
    let mounted = true

    // ── Step 1: 네트워크 없이 localStorage만으로 즉시 복원 ──
    const localSession = getLocalSession()
    const cached = loadCache()

    if (localSession && cached && cached.email === localSession.email) {
      // 세션 + 캐시 모두 있음 → 즉시 로그인 상태로
      setUser(cached)
      setLoading(false)
      initialized.current = true
      // 백그라운드에서 프로필 갱신
      fetchProfile(localSession.email).then(p => { if (mounted && p) setUser(p) })
    }

    // ── Step 2: Supabase 인증 상태 변화 감지 ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          // 세션 유효 → 프로필 갱신
          const profile = await fetchProfile(session.user.email!)
          if (mounted && profile) setUser(profile)
        } else {
          // 세션 없음 → 캐시 지우고 로그인으로
          clearCache()
          if (mounted) setUser(null)
        }
        if (mounted && !initialized.current) {
          initialized.current = true
          setLoading(false)
        }

      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          const profile = await fetchProfile(session.user.email!)
          if (mounted && profile) {
            setUser(profile)
            if (!initialized.current) {
              initialized.current = true
              setLoading(false)
            }
          }
        }

      } else if (event === 'TOKEN_REFRESHED') {
        // 토큰 갱신됨 → 로그인 유지, 아무것도 안 해도 됨

      } else if (event === 'SIGNED_OUT') {
        clearCache()
        if (mounted) {
          setUser(null)
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
    // 10초 타임아웃
    const loginPromise = supabase.auth.signInWithPassword({ email, password })
      .then(({ error }) => error?.message ?? null)
      .catch(() => '로그인 중 오류가 발생했습니다.')

    const timeout = new Promise<string>(resolve =>
      setTimeout(() => resolve('요청이 너무 오래 걸립니다. 다시 시도해주세요.'), 10000)
    )

    return Promise.race([loginPromise, timeout])
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
