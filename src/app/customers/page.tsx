'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  '상담중': 'bg-blue-50 text-blue-600 border border-blue-100',
  '가계약': 'bg-amber-50 text-amber-700 border border-amber-200',
  '계약완료': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '취소': 'bg-slate-100 text-slate-500 border border-slate-200',
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  '장례중': { icon: '⚰️', color: 'text-purple-700', bg: 'bg-purple-50' },
  '위중': { icon: '🕯️', color: 'text-rose-700', bg: 'bg-rose-50' },
  '사전분양': { icon: '🏛️', color: 'text-teal-700', bg: 'bg-teal-50' },
  '개장이장': { icon: '🔄', color: 'text-orange-700', bg: 'bg-orange-50' },
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: '장례중', label: '⚰️ 장례중' },
  { key: '위중', label: '🕯️ 위중' },
  { key: '사전분양', label: '🏛️ 사전분양' },
  { key: '개장이장', label: '🔄 개장이장' },
]

export default function CustomersPage() {
  return <Suspense><CustomersContent /></Suspense>
}

function CustomersContent() {
  const { user, loading, sessionReady } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (sessionReady) loadCustomers()
  }, [sessionReady])

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    setCustomers(data || [])
    setDataLoading(false)
  }

  const filtered = customers.filter(c => {
    if (filter !== 'all' && c.customer_type !== filter) return false
    if (search && !c.name.includes(search) && !(c.phone || '').includes(search)) return false
    return true
  })

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">고객 관리</h2>
          <Link
            href="/customers/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-indigo-200 transition-colors"
          >
            + 등록
          </Link>
        </div>

        {/* 검색 */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="이름 또는 연락처 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                filter === f.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 건수 표시 */}
        {!dataLoading && (
          <p className="text-xs text-slate-400 mb-3">{filtered.length}명</p>
        )}

        {/* 고객 목록 */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">👤</span>
            <p className="text-sm font-medium text-slate-500 mt-1">고객이 없습니다</p>
            <p className="text-xs text-slate-400">새 고객을 등록해보세요</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(c => {
              const typeConf = TYPE_CONFIG[c.customer_type] || { icon: '👤', color: 'text-slate-600', bg: 'bg-slate-50' }
              return (
                <Link key={c.id} href={`/customers/${c.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 hover:border-indigo-200 hover:shadow-indigo-50 transition-all active:opacity-80">
                  {/* 타입 아이콘 */}
                  <div className={`w-10 h-10 ${typeConf.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                    {typeConf.icon}
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                      {c.assigned_sales_name && (
                        <span className="text-xs text-slate-400 truncate">· {c.assigned_sales_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{c.phone || '연락처 없음'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  {/* 상태 뱃지 */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-500'}`}>
                    {c.status}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
