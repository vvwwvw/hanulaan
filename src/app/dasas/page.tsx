'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Dasa } from '@/lib/types'

export default function DasasPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [dasas, setDasas] = useState<(Dasa & { sales?: { name: string } })[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (user) loadDasas()
  }, [user])

  async function loadDasas() {
    let query = supabase
      .from('dasas')
      .select('*, sales:users!sales_id(name)')
      .order('created_at', { ascending: false })

    if (user?.role === 'sales') {
      query = query.eq('sales_id', user.id)
    }

    const { data } = await query
    setDasas((data || []) as any)
    setDataLoading(false)
  }

  async function deleteDasa(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('dasas').delete().eq('id', id)
    loadDasas()
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">답사자 현황</h2>
          <Link href="/dasas/new" className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">+ 등록</Link>
        </div>

        {dataLoading ? (
          <p className="text-center text-gray-400 py-10">불러오는 중...</p>
        ) : dasas.length === 0 ? (
          <p className="text-center text-gray-400 py-10">등록된 답사자가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {dasas.map(d => (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{d.customer_name}</p>
                    <p className="text-xs text-gray-500">{d.phone || '연락처 없음'}</p>
                    {d.funeral_home && <p className="text-xs text-gray-600 mt-0.5">장례식장: {d.funeral_home}</p>}
                    {d.visit_schedule && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        답사일정: {new Date(d.visit_schedule).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {d.sangjo && <p className="text-xs text-gray-500">상조: {d.sangjo}</p>}
                    {d.notes && <p className="text-xs text-gray-400 mt-1">{d.notes}</p>}
                    {(d as any).sales && <p className="text-xs text-gray-400 mt-1">담당: {(d as any).sales.name}</p>}
                  </div>
                  {(user.role === 'admin' || user.id === d.sales_id) && (
                    <button onClick={() => deleteDasa(d.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-2">{new Date(d.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
