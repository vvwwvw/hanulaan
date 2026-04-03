'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { href: '/', label: '홈', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/customers', label: '고객', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/contracts', label: '계약', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2"/>
      <path d="M8 8h8M8 12h8M8 16h5" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/products', label: '상품', icon: (active: boolean) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2"/>
      <path d="M16 7V5a4 4 0 00-8 0v2" stroke={active ? '#4F46E5' : '#94A3B8'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <>
      {/* 상단 헤더 */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-base">🕊️</span>
          </div>
          <span className="font-bold text-base tracking-tight">고객관리</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-white leading-none">{user?.name}</span>
            <span className="text-[10px] text-indigo-200 mt-0.5">{user?.role === 'admin' ? '관리자' : '상담자'}</span>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
        <div className="flex max-w-lg mx-auto">
          {navItems.map(item => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-0.5"
              >
                {item.icon(isActive)}
                <span className={`text-[11px] font-semibold transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-indigo-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
