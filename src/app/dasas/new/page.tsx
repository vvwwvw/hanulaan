'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function NewDasaPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    visit_schedule: '',
    funeral_home: '',
    address: '',
    sangjo: '',
    discount: '',
    special_request: '',
    notes: '',
  })

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('dasas').insert({
      customer_name: form.customer_name,
      phone: form.phone || null,
      visit_schedule: form.visit_schedule || null,
      funeral_home: form.funeral_home || null,
      address: form.address || null,
      sangjo: form.sangjo || null,
      discount: form.discount || null,
      special_request: form.special_request || null,
      notes: form.notes || null,
      sales_id: user?.id,
    })

    if (!error) {
      router.push('/dasas')
    } else {
      alert('저장 중 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500">← 뒤로</button>
          <h2 className="text-lg font-bold text-gray-800">답사자 등록</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">기본 정보</h3>
            <Field label="답사자명 *">
              <input required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} className={cls} placeholder="이름 입력" />
            </Field>
            <Field label="연락처">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={cls} placeholder="010-0000-0000" />
            </Field>
            <Field label="답사 일정">
              <input type="date" value={form.visit_schedule} onChange={e => set('visit_schedule', e.target.value)} className={cls} />
            </Field>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">장례 정보</h3>
            <Field label="장례식장">
              <input value={form.funeral_home} onChange={e => set('funeral_home', e.target.value)} className={cls} placeholder="장례식장명 또는 자택보관" />
            </Field>
            <Field label="거주지">
              <input value={form.address} onChange={e => set('address', e.target.value)} className={cls} placeholder="주소 입력" />
            </Field>
            <Field label="상조">
              <input value={form.sangjo} onChange={e => set('sangjo', e.target.value)} className={cls} placeholder="상조회사명" />
            </Field>
            <Field label="할인">
              <input value={form.discount} onChange={e => set('discount', e.target.value)} className={cls} placeholder="할인 내용" />
            </Field>
            <Field label="안치단 요청">
              <input value={form.special_request} onChange={e => set('special_request', e.target.value)} className={cls} placeholder="요청사항" />
            </Field>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">메모</h3>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={cls + ' h-20 resize-none'} placeholder="특이사항" />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition">
            {saving ? '저장 중...' : '답사자 등록'}
          </button>
        </form>
      </main>
    </div>
  )
}

const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
