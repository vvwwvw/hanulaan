'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Stats {
  totalCustomers: number
  provisionalCount: number
  expiringCount: number
  funeralCount: number
}

interface ExpiringContract {
  id: string
  customer: { name: string }
  expiry_date: string
  daysLeft: number
}

export default function DashboardPage() {
  const { user, loading, sessionReady } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, provisionalCount: 0, expiringCount: 0, funeralCount: 0 })
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (sessionReady) loadDashboard()
  }, [sessionReady])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]
    const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

    const [customersRes, provisionalRes, funeralRes, contractsRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', '가계약'),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('customer_type', '위중'),
      supabase.from('contracts').select('id, expiry_date, customer:customers(name)').eq('contract_type', '가계약').eq('is_completed', false).lte('expiry_date', threeDaysLater).gte('expiry_date', today),
    ])

    const expiring = (contractsRes.data || []).map((c: any) => ({
      ...c,
      daysLeft: Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000),
    }))

    setStats({
      totalCustomers: customersRes.count || 0,
      provisionalCount: provisionalRes.count || 0,
      expiringCount: expiring.length,
      funeralCount: funeralRes.count || 0,
    })
    setExpiringContracts(expiring)
    setDataLoading(false)
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">

        {/* 인사 헤더 */}
        <div className="mb-5">
          <p className="text-slate-400 text-sm">안녕하세요 👋</p>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{user.name}님</h2>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard
            label="전체 고객"
            value={stats.totalCustomers}
            href="/customers"
            gradient="from-indigo-500 to-indigo-600"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
          />
          <StatCard
            label="가계약 진행중"
            value={stats.provisionalCount}
            href="/contracts"
            gradient="from-amber-400 to-amber-500"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <rect x="4" y="3" width="16" height="18" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M8 8h8M8 12h8M8 16h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
          />
          <StatCard
            label="위중 관리"
            value={stats.funeralCount}
            href="/customers?filter=위중"
            gradient="from-purple-500 to-purple-600"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path d="M12 2C9 2 6 5 6 9c0 5 6 13 6 13s6-8 6-13c0-4-3-7-6-7z" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="9" r="2" stroke="white" strokeWidth="2"/>
              </svg>
            }
          />
          <StatCard
            label="만료 임박"
            value={stats.expiringCount}
            href="/contracts"
            gradient="from-rose-400 to-rose-500"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
          />
        </div>

        {/* 만료 임박 알림 */}
        {expiringContracts.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm font-bold text-rose-600">⚠️ 가계약 만료 임박</span>
              <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">{expiringContracts.length}건</span>
            </div>
            <div className="space-y-2">
              {expiringContracts.map(c => (
                <Link key={c.id} href="/contracts"
                  className="flex items-center justify-between bg-white border border-rose-200 rounded-2xl px-4 py-3 shadow-sm hover:border-rose-300 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{(c.customer as any)?.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">만료일 {c.expiry_date}</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-xl ${
                    c.daysLeft <= 1 ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {c.daysLeft === 0 ? '오늘!' : `D-${c.daysLeft}`}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 빠른 메뉴 */}
        <div className="mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">빠른 메뉴</p>
          <div className="grid grid-cols-3 gap-3">
            <QuickLink href="/customers/new" emoji="➕" label="고객 등록" color="bg-indigo-50" textColor="text-indigo-600" />
            <QuickLink href="/contracts" emoji="📋" label="계약 관리" color="bg-amber-50" textColor="text-amber-600" />
            <QuickLink href="/products" emoji="📦" label="상품 판매" color="bg-emerald-50" textColor="text-emerald-600" />
          </div>
        </div>

      </main>
    </div>
  )
}

function StatCard({ label, value, gradient, icon, href }: {
  label: string; value: number; gradient: string; icon: React.ReactNode; href: string
}) {
  return (
    <Link href={href} className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 flex flex-col gap-2 shadow-sm active:opacity-80 transition-opacity`}>
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-medium text-white/80 mt-0.5">{label}</p>
      </div>
    </Link>
  )
}

function QuickLink({ href, emoji, label, color, textColor }: {
  href: string; emoji: string; label: string; color: string; textColor: string
}) {
  return (
    <Link href={href}
      className={`${color} rounded-2xl p-3.5 flex flex-col items-center gap-2 border border-transparent hover:border-slate-100 transition-colors`}>
      <span className="text-2xl">{emoji}</span>
      <span className={`text-xs font-semibold ${textColor} text-center leading-tight`}>{label}</span>
    </Link>
  )
}
