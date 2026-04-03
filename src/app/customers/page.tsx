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

const TYPE_CONFIG: Record<string, { dot: string; color: string; bg: string; label: string }> = {
  '장례중': { dot: 'bg-purple-500', color: 'text-purple-700', bg: 'bg-purple-50', label: '장례중' },
  '위중': { dot: 'bg-rose-500', color: 'text-rose-700', bg: 'bg-rose-50', label: '위중' },
  '사전분양': { dot: 'bg-teal-500', color: 'text-teal-700', bg: 'bg-teal-50', label: '사전분양' },
  '개장이장': { dot: 'bg-orange-500', color: 'text-orange-700', bg: 'bg-orange-50', label: '개장이장' },
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: '장례중', label: '장례중' },
  { key: '위중', label: '위중' },
  { key: '사전분양', label: '사전분양' },
  { key: '개장이장', label: '개장이장' },
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
  const [sort, setSort] = useState<'newest'|'visit'>('visit')

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
  }).sort((a, b) => {
    if (sort === 'visit') {
      if (!a.visit_schedule && !b.visit_schedule) return 0
      if (!a.visit_schedule) return 1
      if (!b.visit_schedule) return -1
      return new Date(a.visit_schedule).getTime() - new Date(b.visit_schedule).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

        {/* 건수 + 정렬 */}
        {!dataLoading && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">{filtered.length}명</p>
            <div className="flex gap-1">
              {([{key:'newest',label:'최신순'},{key:'visit',label:'답사일순'}] as const).map(s => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${sort === s.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
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
            {search || filter !== 'all' ? (
              <p className="text-xs text-slate-400">검색 조건을 바꿔보세요</p>
            ) : (
              <Link href="/customers/new" className="mt-1 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition">
                + 첫 고객 등록
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(c => {
              const typeConf = TYPE_CONFIG[c.customer_type] || { dot: 'bg-slate-400', color: 'text-slate-600', bg: 'bg-slate-50', label: c.customer_type }
              return (
                <div key={c.id} onClick={() => router.push(`/customers/${c.id}`)}
                  className={`flex items-center gap-3 bg-white rounded-2xl border shadow-sm px-4 py-3.5 transition-all active:opacity-80 cursor-pointer ${
                    c.is_risky ? 'border-rose-200 hover:border-rose-300' : 'border-slate-100 hover:border-indigo-200'
                  }`}>
                  {/* 타입 인디케이터 */}
                  <div className={`w-10 h-10 ${typeConf.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${typeConf.dot}`} />
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color}`}>{typeConf.label}</span>
                      {c.is_risky && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">위험</span>}
                    </div>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                        className="text-xs text-indigo-500 font-medium mt-0.5 flex items-center gap-1 w-fit">
                        📞 {c.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">연락처 없음</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.visit_schedule ? `답사 ${new Date(c.visit_schedule).toLocaleDateString('ko-KR')}` : '답사일 미정'}
                    </p>
                  </div>
                  {/* 상태 뱃지 */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-500'}`}>
                    {c.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
