'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const cls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition'
const lbl = 'text-xs font-semibold text-slate-500 block mb-1.5'
const FORM_CACHE = 'hanulaan_contract_form'

// 날짜 문자열에 n일 더하기 (YYYY-MM-DD → YYYY-MM-DD), 타임존 무관
function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-')
}

// 숫자 → 회계 형식 (1000000 → 1,000,000)
function numFmt(v: string) {
  const n = v.replace(/[^0-9]/g, '')
  return n ? Number(n).toLocaleString('ko-KR') : ''
}
function numRaw(v: string) { return v.replace(/[^0-9]/g, '') }

// 할인 금액 계산
function calcDiscount(total: string, dtype: string, dvalue: string): number {
  const t = parseInt(numRaw(total)) || 0
  const d = parseFloat(dvalue) || 0
  if (!dtype || !d) return 0
  if (dtype === 'rate') return Math.round(t * d / 100)
  return d
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contractSearch, setContractSearch] = useState('')
  const [contractFilter, setContractFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [postingComment, setPostingComment] = useState<string | null>(null)

  const defaultForm = {
    customer_id: searchParams.get('customer_id') || '',
    contract_type: '가계약',
    provisional_date: new Date().toISOString().split('T')[0],
    expiry_date: addDays(new Date().toISOString().split('T')[0], 14),
    lot_number: '',
    total_amount: '',
    paid_amount: '',
    discount_type: '',
    discount_value: '',
    notes: '',
  }
  const [form, setForm] = useState(defaultForm)

  // 앱 전환 후 복귀 시 신규 등록 폼만 복원 (수정/전환 모드는 복원 안 함)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_CACHE)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.form && parsed.showForm && !parsed.editingId && !parsed.promotingId) {
          setForm(parsed.form)
          setShowForm(true)
        } else {
          // 수정/전환 중 캐시는 버림 (오류로 남은 잔재 방지)
          clearCache()
        }
      }
    } catch { clearCache() }
  }, [])

  // 폼 변경 시 자동 저장
  useEffect(() => {
    if (showForm || editingId || promotingId) {
      try { localStorage.setItem(FORM_CACHE, JSON.stringify({ form, editingId, promotingId, showForm })) } catch {}
    }
  }, [form, showForm, editingId, promotingId])

  function clearCache() { try { localStorage.removeItem(FORM_CACHE) } catch {} }

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

  async function loadComments(contractId: string) {
    const { data } = await supabase
      .from('contract_comments')
      .select('*, user:users!user_id(name, role)')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [contractId]: data || [] }))
  }

  async function postComment(contractId: string) {
    const content = (newComment[contractId] || '').trim()
    if (!content) return
    setPostingComment(contractId)
    await supabase.from('contract_comments').insert({ contract_id: contractId, user_id: user?.id, content })
    setNewComment(prev => ({ ...prev, [contractId]: '' }))
    setPostingComment(null)
    loadComments(contractId)
  }

  async function deleteComment(commentId: string, contractId: string) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await supabase.from('contract_comments').delete().eq('id', commentId)
    loadComments(contractId)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function startEdit(c: any) {
    clearCache()
    setEditingId(c.id); setPromotingId(null); setShowForm(false)
    const pDate = c.provisional_date || ''
    setForm({
      customer_id: c.customer_id,
      contract_type: c.contract_type,
      provisional_date: pDate,
      expiry_date: c.contract_type === '가계약' && pDate ? addDays(pDate, 14) : c.expiry_date || '',
      lot_number: c.lot_number || '',
      total_amount: c.total_amount ? String(c.total_amount) : '',
      paid_amount: c.paid_amount ? String(c.paid_amount) : '',
      discount_type: c.discount_type || '',
      discount_value: c.discount_value ? String(c.discount_value) : '',
      notes: c.notes || '',
    })
  }

  function startPromote(c: any) {
    setPromotingId(c.id); setEditingId(null); setShowForm(false)
    setForm({
      customer_id: c.customer_id,
      contract_type: '본계약',
      provisional_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      lot_number: c.lot_number || '',
      total_amount: c.total_amount ? String(c.total_amount) : '',
      paid_amount: c.paid_amount ? String(c.paid_amount) : '',
      discount_type: c.discount_type || '',
      discount_value: c.discount_value ? String(c.discount_value) : '',
      notes: c.notes || '',
    })
  }

  function cancelEdit() {
    setEditingId(null); setPromotingId(null); setShowForm(false); setForm(defaultForm); clearCache()
  }

  function buildPayload() {
    const totalRawVal = form.total_amount ? parseInt(numRaw(form.total_amount)) : null
    const paidRawVal = form.paid_amount ? parseInt(numRaw(form.paid_amount)) : 0
    const discountValRaw = form.discount_value
      ? (form.discount_type === 'rate' ? parseFloat(form.discount_value) : parseInt(numRaw(form.discount_value)))
      : null
    const discountAmt = calcDiscount(form.total_amount, form.discount_type, form.discount_value)
    // 만료일은 항상 계약일 기준 +14일로 재계산 (캐시·구DB값 무시)
    const computedExpiry = form.contract_type === '가계약' && form.provisional_date
      ? addDays(form.provisional_date, 14)
      : null
    return {
      contract_type: form.contract_type,
      provisional_date: form.provisional_date || null,
      expiry_date: computedExpiry,
      lot_number: form.lot_number || null,
      total_amount: totalRawVal,
      paid_amount: paidRawVal,
      discount_type: form.discount_type || null,
      discount_value: discountValRaw,
      discount_amount: discountAmt || null,
      notes: form.notes || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload()

      if (editingId) {
        const { error } = await supabase.from('contracts').update({ ...payload, is_completed: form.contract_type === '본계약' }).eq('id', editingId)
        if (error) throw new Error(error.message)
        setEditingId(null)
      } else if (promotingId) {
        const orig = contracts.find(c => c.id === promotingId)
        const historyText = `[가계약 이력] 계약일: ${orig.provisional_date || '-'} / 안치단: ${orig.lot_number || '-'} / 분양금: ${orig.total_amount ? orig.total_amount.toLocaleString() + '원' : '-'} / 계약금: ${orig.paid_amount ? orig.paid_amount.toLocaleString() + '원' : '-'} / 메모: ${orig.notes || '-'}`
        const { error } = await supabase.from('contracts').update({ ...payload, history: historyText, is_completed: true }).eq('id', promotingId)
        if (error) throw new Error(error.message)
        await supabase.from('customers').update({ status: '계약완료' }).eq('id', form.customer_id)
        const cust = customers.find(c => c.id === form.customer_id)
        if (cust) {
          await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'new_contract', customerName: cust.name, lotNumber: form.lot_number || '미정', amount: form.total_amount ? parseInt(numRaw(form.total_amount)).toLocaleString() + '원' : '미입력' }) })
        }
        setPromotingId(null)
      } else {
        const { error } = await supabase.from('contracts').insert({ customer_id: form.customer_id, ...payload, is_completed: form.contract_type === '본계약' })
        if (error) throw new Error(error.message)
        await supabase.from('customers').update({ status: form.contract_type === '가계약' ? '가계약' : '계약완료' }).eq('id', form.customer_id)
        setShowForm(false)
      }

      clearCache()
      setForm(defaultForm)
      loadAll()
      showToast('저장되었습니다')
    } catch (err: any) {
      alert('저장 오류: ' + (err?.message || '다시 시도해주세요'))
      clearCache()
    } finally {
      setSaving(false)
    }
  }

  function getDaysLeft(expiry: string) {
    const [y, m, d] = expiry.split('-').map(Number)
    const expiryLocal = new Date(y, m - 1, d)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((expiryLocal.getTime() - today.getTime()) / 86400000)
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  const activeFormId = editingId || promotingId
  const formTitle = promotingId ? '본계약 전환' : editingId ? '계약 수정' : '계약 등록'
  const filteredContracts = contracts.filter(c => {
    if (contractFilter !== 'all' && c.contract_type !== contractFilter) return false
    if (contractSearch && !(c.customer?.name || '').includes(contractSearch)) return false
    return true
  })
  const discountAmt = calcDiscount(form.total_amount, form.discount_type, form.discount_value)
  const totalRaw = parseInt(numRaw(form.total_amount)) || 0
  const paidRaw = parseInt(numRaw(form.paid_amount)) || 0
  const remaining = totalRaw - discountAmt - paidRaw

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">계약 관리</h2>
          <button
            onClick={() => { if (showForm || activeFormId) { cancelEdit() } else { setShowForm(true) } }}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
              showForm || activeFormId
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
            }`}
          >
            {showForm || activeFormId ? '취소' : '+ 등록'}
          </button>
        </div>

        {/* 등록/수정 폼 */}
        {(showForm || activeFormId) && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-700">{formTitle}</h3>
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
                      <button key={t} type="button" onClick={() => {
                        set('contract_type', t)
                        if (t === '가계약' && form.provisional_date) {
                          set('expiry_date', addDays(form.provisional_date, 14))
                        }
                      }}
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
                  <input type="date" value={form.provisional_date} onChange={e => {
                    const d = e.target.value
                    set('provisional_date', d)
                    if (form.contract_type === '가계약' && d) {
                      set('expiry_date', addDays(d, 14))
                    }
                  }} className={cls} />
                </div>
                {form.contract_type === '가계약' && (
                  <div>
                    <label className={lbl}>만료일 (자동 +2주)</label>
                    <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={cls} />
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>안치단</label>
                <input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} className={cls} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>분양금액 (원)</label>
                  <input
                    inputMode="numeric"
                    value={numFmt(form.total_amount)}
                    onChange={e => set('total_amount', numRaw(e.target.value))}
                    className={cls}
                  />
                </div>
                <div>
                  <label className={lbl}>계약금 (원)</label>
                  <input
                    inputMode="numeric"
                    value={numFmt(form.paid_amount)}
                    onChange={e => set('paid_amount', numRaw(e.target.value))}
                    className={cls}
                  />
                </div>
              </div>

              {/* 할인 */}
              <div>
                <label className={lbl}>할인</label>
                <div className="flex gap-2">
                  <div className="flex gap-1 shrink-0">
                    {['', 'rate', 'amount'].map(t => (
                      <button key={t} type="button" onClick={() => { set('discount_type', t); set('discount_value', '') }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          form.discount_type === t
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                        {t === '' ? '없음' : t === 'rate' ? '%' : '원'}
                      </button>
                    ))}
                  </div>
                  {form.discount_type && (
                    <div className="relative flex-1">
                      <input
                        inputMode="numeric"
                        value={form.discount_type === 'rate' ? form.discount_value : numFmt(form.discount_value)}
                        onChange={e => set('discount_value', form.discount_type === 'rate' ? e.target.value.replace(/[^0-9.]/g, '') : numRaw(e.target.value))}
                        className={cls}
                        placeholder={form.discount_type === 'rate' ? '예: 10' : ''}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                        {form.discount_type === 'rate' ? '%' : '원'}
                      </span>
                    </div>
                  )}
                </div>
                {/* 할인 미리보기 */}
                {discountAmt > 0 && (
                  <p className="text-xs text-indigo-600 font-semibold mt-1.5">
                    할인 금액: -{discountAmt.toLocaleString()}원
                  </p>
                )}
              </div>

              {/* 잔금 미리보기 */}
              {totalRaw > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <FinRow label="분양금" value={totalRaw} />
                  {discountAmt > 0 && <FinRow label="할인" value={-discountAmt} color="text-indigo-600" />}
                  {paidRaw > 0 && <FinRow label="계약금" value={-paidRaw} color="text-amber-600" />}
                  <div className="border-t border-slate-200 pt-1.5">
                    <FinRow label="잔금" value={remaining} color={remaining <= 0 ? 'text-emerald-600' : 'text-rose-600'} bold />
                  </div>
                </div>
              )}

              <div>
                <label className={lbl}>메모</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={cls + ' h-16 resize-none'} />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
                {saving ? '저장 중...' : formTitle}
              </button>
            </div>
          </form>
        )}

        {/* 검색 + 필터 */}
        {!showForm && !activeFormId && (
          <>
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="고객명 검색" value={contractSearch} onChange={e => setContractSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" />
            </div>
            <div className="flex gap-2 mb-4">
              {[{key:'all',label:'전체'},{key:'가계약',label:'📝 가계약'},{key:'본계약',label:'✅ 본계약'}].map(f => (
                <button key={f.key} onClick={() => setContractFilter(f.key)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${contractFilter === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}>
                  {f.label}
                </button>
              ))}
              {filteredContracts.length > 0 && <span className="ml-auto text-xs text-slate-400 self-center">{filteredContracts.length}건</span>}
            </div>
          </>
        )}

        {/* 계약 목록 */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">불러오는 중...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm font-medium text-slate-500 mt-1">계약 내역이 없습니다</p>
            {contractSearch || contractFilter !== 'all' ? (
              <p className="text-xs text-slate-400">검색 조건을 바꿔보세요</p>
            ) : (
              <button onClick={() => setShowForm(true)}
                className="mt-1 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition">
                + 첫 계약 등록
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map(c => {
              const daysLeft = c.expiry_date ? getDaysLeft(c.expiry_date) : null
              const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0
              const isExpanded = expandedId === c.id
              const discAmt = c.discount_amount || calcDiscount(String(c.total_amount || ''), c.discount_type, String(c.discount_value || ''))
              const remain = (c.total_amount || 0) - discAmt - (c.paid_amount || 0)

              return (
                <div key={c.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isExpiringSoon ? 'border-rose-200' : 'border-slate-100'
                }`}>
                  <div className={`h-1 ${c.contract_type === '본계약' ? 'bg-emerald-500' : isExpiringSoon ? 'bg-rose-500' : 'bg-amber-400'}`} />

                  {/* 헤더 — 클릭 시 확장 */}
                  <button type="button" onClick={() => {
                    const next = isExpanded ? null : c.id
                    setExpandedId(next)
                    if (next && !comments[next]) loadComments(next)
                  }} className="w-full px-4 py-3.5 text-left">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{c.customer?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.lot_number || '안치단 미정'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            c.contract_type === '본계약'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>{c.contract_type}</span>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>

                    {/* 접힌 상태 요약 */}
                    {!isExpanded && c.total_amount > 0 && (
                      <div className="mt-1.5 flex gap-3 text-xs text-slate-400">
                        <span>분양금 {c.total_amount.toLocaleString()}원</span>
                        <span className={remain <= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>잔금 {remain.toLocaleString()}원</span>
                        {c.notes && <span className="truncate max-w-[120px]">📝 {c.notes}</span>}
                      </div>
                    )}
                  </button>

                  {/* 확장된 상세 내용 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      {/* 금액 내역 */}
                      {c.total_amount > 0 && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                          <FinRow label="분양금" value={c.total_amount} />
                          {discAmt > 0 && <FinRow label={c.discount_type === 'rate' ? `할인 (${c.discount_value}%)` : '할인'} value={-discAmt} color="text-indigo-600" />}
                          {c.paid_amount > 0 && <FinRow label="계약금" value={-c.paid_amount} color="text-amber-600" />}
                          <div className="border-t border-slate-200 pt-1">
                            <FinRow label="잔금" value={remain} color={remain <= 0 ? 'text-emerald-600' : 'text-rose-600'} bold />
                          </div>
                        </div>
                      )}
                      {c.provisional_date && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-semibold">계약일</span>
                          <span className="text-slate-800">{c.provisional_date}</span>
                        </div>
                      )}
                      {c.expiry_date && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-semibold">만료일</span>
                          <span className={isExpiringSoon ? 'text-rose-600 font-bold' : 'text-slate-800'}>{c.expiry_date}</span>
                        </div>
                      )}
                      {c.notes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-slate-500 mb-1">📝 메모</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.notes}</p>
                        </div>
                      )}
                      {c.history && (
                        <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-400 border border-slate-100">
                          📋 {c.history}
                        </div>
                      )}
                      {/* 메모 섹션 */}
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-xs font-bold text-slate-600 mb-2">💬 메모</p>
                        <div className="space-y-2 mb-2">
                          {(comments[c.id] || []).length === 0 && (
                            <p className="text-xs text-slate-400">아직 메모가 없습니다</p>
                          )}
                          {(comments[c.id] || []).map((cm: any) => (
                            <div key={cm.id} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800">{cm.user?.name}</span>
                                  <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{cm.user?.role === 'admin' ? '관리자' : '상담자'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400">{new Date(cm.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  {(user?.id === cm.user_id || user?.role === 'admin') && (
                                    <button onClick={() => deleteComment(cm.id, c.id)} className="text-[11px] text-rose-400 hover:text-rose-600">삭제</button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{cm.content}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            value={newComment[c.id] || ''}
                            onChange={e => setNewComment(prev => ({ ...prev, [c.id]: e.target.value }))}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none h-14 transition"
                            placeholder="메모 입력..."
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postComment(c.id) }}
                          />
                          <button
                            onClick={() => postComment(c.id)}
                            disabled={postingComment === c.id || !(newComment[c.id] || '').trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-colors"
                          >
                            등록
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { startEdit(c); setExpandedId(null) }}
                          className="flex-1 text-xs font-semibold border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                          수정
                        </button>
                        {c.contract_type === '가계약' && (
                          <button onClick={() => { startPromote(c); setExpandedId(null) }}
                            className="flex-1 text-xs font-bold border border-emerald-300 text-emerald-700 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                            ✅ 본계약 전환
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

function FinRow({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-xs ${bold ? 'font-bold' : 'font-medium'}`}>
      <span className="text-slate-500">{label}</span>
      <span className={color || 'text-slate-800'}>
        {value < 0 ? '-' : ''}{Math.abs(value).toLocaleString()}원
      </span>
    </div>
  )
}
