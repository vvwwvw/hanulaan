'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  sessionReady: boolean  // 토큰 확인 완료 → 데이터 쿼리 가능
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
function clearLocalSession() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

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
  const [sessionReady, setSessionReady] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    let mounted = true

    // Step 1: localStorage에서 즉시 복원 (네트워크 없음)
    const localSession = getLocalSession()
    const cached = loadCache()
    if (localSession && cached && cached.email === localSession.email) {
      setUser(cached)
      setLoading(false)
      initialized.current = true
      // sessionReady는 INITIAL_SESSION 후에 true로 설정
    }

    // Step 2: Supabase 토큰 확인 (백그라운드)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          // 토큰 유효 → 프로필 갱신 + 데이터 쿼리 허용
          const profile = await fetchProfile(session.user.email!)
          if (mounted && profile) setUser(profile)
          if (mounted) setSessionReady(true)
        } else {
          // 세션 없음 → 로그아웃
          clearLocalSession()
          if (mounted) { setUser(null); setSessionReady(false) }
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
            setSessionReady(true)
            if (!initialized.current) {
              initialized.current = true
              setLoading(false)
            }
          }
        }

      } else if (event === 'TOKEN_REFRESHED') {
        if (mounted) setSessionReady(true)

      } else if (event === 'SIGNED_OUT') {
        clearLocalSession()
        if (mounted) {
          setUser(null)
          setSessionReady(false)
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
    const loginPromise = supabase.auth.signInWithPassword({ email, password })
      .then(({ error }) => error?.message ?? null)
      .catch(() => '로그인 중 오류가 발생했습니다.')
    const timeout = new Promise<string>(resolve =>
      setTimeout(() => resolve('요청이 너무 오래 걸립니다. 다시 시도해주세요.'), 10000)
    )
    return Promise.race([loginPromise, timeout])
  }

  async function signOut() {
    clearLocalSession()
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
