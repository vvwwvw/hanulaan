'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const cls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition'
const lbl = 'text-xs font-semibold text-slate-500 block mb-1.5'

export default function ContractsPage() {
  return <Suspense><ContractsContent /></Suspense>
}

function ContractsContent() {
  const { user, loading, sessionReady } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [contracts, setContracts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showForm, setShowForm] = useState(!!searchParams.get('customer_id'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    customer_id: searchParams.get('customer_id') || '',
    contract_type: '가계약',
    provisional_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    lot_number: '',
    total_amount: '',
    paid_amount: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (sessionReady) loadAll()
  }, [sessionReady])

  async function loadAll() {
    const [cRes, custRes] = await Promise.all([
      supabase.from('contracts').select('*, customer:customers(id, name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name'),
    ])
    setContracts(cRes.data || [])
    setCustomers(custRes.data || [])
    setDataLoading(false)
  }

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function startEdit(c: any) {
    setEditingId(c.id); setPromotingId(null); setShowForm(false)
    setForm({ customer_id: c.customer_id, contract_type: c.contract_type, provisional_date: c.provisional_date || '', expiry_date: c.expiry_date || '', lot_number: c.lot_number || '', total_amount: c.total_amount ? String(c.total_amount) : '', paid_amount: c.paid_amount ? String(c.paid_amount) : '', notes: c.notes || '' })
  }

  function startPromote(c: any) {
    setPromotingId(c.id); setEditingId(null); setShowForm(false)
    setForm({ customer_id: c.customer_id, contract_type: '본계약', provisional_date: new Date().toISOString().split('T')[0], expiry_date: '', lot_number: c.lot_number || '', total_amount: c.total_amount ? String(c.total_amount) : '', paid_amount: c.paid_amount ? String(c.paid_amount) : '', notes: c.notes || '' })
  }

  function cancelEdit() { setEditingId(null); setPromotingId(null); setForm(emptyForm) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (editingId) {
      await supabase.from('contracts').update({
        contract_type: form.contract_type,
        provisional_date: form.provisional_date || null,
        expiry_date: form.contract_type === '가계약' ? form.expiry_date || null : null,
        lot_number: form.lot_number || null,
        total_amount: form.total_amount ? parseInt(form.total_amount) : null,
        paid_amount: form.paid_amount ? parseInt(form.paid_amount) : 0,
        notes: form.notes || null,
        is_completed: form.contract_type === '본계약',
      }).eq('id', editingId)
      setEditingId(null)
    } else if (promotingId) {
      const orig = contracts.find(c => c.id === promotingId)
      const historyText = `[가계약 이력] 계약일: ${orig.provisional_date || '-'} / 만료일: ${orig.expiry_date || '-'} / 호수: ${orig.lot_number || '-'} / 금액: ${orig.total_amount ? orig.total_amount.toLocaleString() + '원' : '-'} / 납부: ${orig.paid_amount ? orig.paid_amount.toLocaleString() + '원' : '-'} / 메모: ${orig.notes || '-'}`
      await supabase.from('contracts').update({ contract_type: '본계약', provisional_date: form.provisional_date || null, expiry_date: null, lot_number: form.lot_number || null, total_amount: form.total_amount ? parseInt(form.total_amount) : null, paid_amount: form.paid_amount ? parseInt(form.paid_amount) : 0, notes: form.notes || null, history: historyText, is_completed: true }).eq('id', promotingId)
      await supabase.from('customers').update({ status: '계약완료' }).eq('id', form.customer_id)
      const cust = customers.find(c => c.id === form.customer_id)
      if (cust) {
        await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'new_contract', customerName: cust.name, lotNumber: form.lot_number || '미정', amount: form.total_amount ? parseInt(form.total_amount).toLocaleString() + '원' : '미입력' }) })
      }
      setPromotingId(null)
    } else {
      await supabase.from('contracts').insert({ customer_id: form.customer_id, contract_type: form.contract_type, provisional_date: form.provisional_date || null, expiry_date: form.contract_type === '가계약' ? form.expiry_date || null : null, lot_number: form.lot_number || null, total_amount: form.total_amount ? parseInt(form.total_amount) : null, paid_amount: form.paid_amount ? parseInt(form.paid_amount) : 0, notes: form.notes || null, is_completed: form.contract_type === '본계약' })
      if (form.contract_type === '가계약') {
        await supabase.from('customers').update({ status: '가계약' }).eq('id', form.customer_id)
      } else {
        await supabase.from('customers').update({ status: '계약완료' }).eq('id', form.customer_id)
      }
      setShowForm(false)
    }

    setForm(emptyForm)
    loadAll()
    setSaving(false)
  }

  function getDaysLeft(expiry: string) {
    return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  const activeFormId = editingId || promotingId
  const formTitle = promotingId ? '본계약 전환' : editingId ? '계약 수정' : '계약 등록'

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">계약 관리</h2>
          <button
            onClick={() => { setShowForm(!showForm); cancelEdit() }}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
              showForm
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
            }`}
          >
            {showForm ? '취소' : '+ 등록'}
          </button>
        </div>

        {/* 등록/수정 폼 */}
        {(showForm || activeFormId) && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-700">{formTitle}</h3>
              {activeFormId && <button type="button" onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">취소</button>}
            </div>
            <div className="p-4 space-y-3">
              {promotingId && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-700 font-medium">
                  📋 가계약 → 본계약으로 전환합니다. 기존 가계약 정보는 히스토리로 저장됩니다.
                </div>
              )}

              {!activeFormId && (
                <div>
                  <label className={lbl}>고객 *</label>
                  <select required value={form.customer_id} onChange={e => set('customer_id', e.target.value)} className={cls}>
                    <option value="">고객 선택</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {!promotingId && (
                <div>
                  <label className={lbl}>계약 유형</label>
                  <div className="flex gap-2">
                    {['가계약', '본계약'].map(t => (
                      <button key={t} type="button" onClick={() => set('contract_type', t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          form.contract_type === t
                            ? t === '본계약' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        {t === '가계약' ? '📝 가계약' : '✅ 본계약'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>계약일</label>
                  <input type="date" value={form.provisional_date} onChange={e => set('provisional_date', e.target.value)} className={cls} />
                </div>
                {form.contract_type === '가계약' && (
                  <div>
                    <label className={lbl}>만료일</label>
                    <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={cls} />
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>호수</label>
                <input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} className={cls} placeholder="예: A동 101호" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>분양금액 (원)</label>
                  <input type="number" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} className={cls} placeholder="3000000" />
                </div>
                <div>
                  <label className={lbl}>납부금액 (원)</label>
                  <input type="number" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} className={cls} placeholder="300000" />
                </div>
              </div>

              <div>
                <label className={lbl}>메모</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={cls + ' h-16 resize-none'} placeholder="메모" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
                {saving ? '저장 중...' : formTitle}
              </button>
            </div>
          </form>
        )}

        {/* 계약 목록 */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">불러오는 중...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm font-medium text-slate-500 mt-1">계약 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => {
              const daysLeft = c.expiry_date ? getDaysLeft(c.expiry_date) : null
              const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0
              const isEditing = editingId === c.id || promotingId === c.id
              const paidPct = c.total_amount ? Math.min(100, Math.round(((c.paid_amount || 0) / c.total_amount) * 100)) : 0

              return (
                <div key={c.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isExpiringSoon ? 'border-rose-200' : isEditing ? 'border-indigo-300' : 'border-slate-100'
                }`}>
                  {/* 타입 인디케이터 */}
                  <div className={`h-1 ${c.contract_type === '본계약' ? 'bg-emerald-500' : isExpiringSoon ? 'bg-rose-500' : 'bg-amber-400'}`} />

                  <div className="px-4 py-3.5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900">{c.customer?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.lot_number || '호수 미정'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          c.contract_type === '본계약'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.contract_type}
                        </span>
                        {daysLeft !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            daysLeft <= 1 ? 'bg-rose-100 text-rose-600'
                            : daysLeft <= 3 ? 'bg-orange-100 text-orange-600'
                            : 'bg-slate-100 text-slate-500'
                          }`}>
                            {daysLeft === 0 ? '오늘 만료' : daysLeft < 0 ? '만료됨' : `D-${daysLeft}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 납부 진행 바 */}
                    {c.total_amount && (
                      <div className="mb-2.5">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>납부 {(c.paid_amount || 0).toLocaleString()}원</span>
                          <span className="font-semibold text-slate-700">{c.total_amount.toLocaleString()}원 ({paidPct}%)</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${c.contract_type === '본계약' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    )}

                    {c.expiry_date && <p className="text-xs text-slate-400 mb-1">만료일: {c.expiry_date}</p>}
                    {c.notes && <p className="text-xs text-slate-500 mb-1">{c.notes}</p>}

                    {c.history && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-400 border border-slate-100 mb-2">
                        📋 {c.history}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEdit(c)}
                        className="flex-1 text-xs font-semibold border border-slate-200 text-slate-600 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                        수정
                      </button>
                      {c.contract_type === '가계약' && (
                        <button onClick={() => startPromote(c)}
                          className="flex-1 text-xs font-bold border border-emerald-300 text-emerald-700 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
                          ✅ 본계약 전환
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
