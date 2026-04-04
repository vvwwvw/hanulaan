'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const cls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition'
const lbl = 'text-xs font-semibold text-slate-500 block mb-1.5'

const PRODUCT_CONFIG: Record<string, { icon: string; gradient: string; lightBg: string; textColor: string }> = {
  '상조연계': { icon: '🤝', gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50', textColor: 'text-blue-700' },
  '유골함': { icon: '⚱️', gradient: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-50', textColor: 'text-purple-700' },
  '개장업': { icon: '🔄', gradient: 'from-orange-400 to-orange-500', lightBg: 'bg-orange-50', textColor: 'text-orange-700' },
}

// 사진 카탈로그에서 읽은 유골함 전체 목록
const URN_PRODUCTS: { name: string; price: string; series: string }[] = [
  // 명품 진공함 (220×220) — 62/60만원
  { series: '명품 진공함', name: '도원칼라송학 · DW-1', price: '62만원' },
  { series: '명품 진공함', name: '도원칼라난 · DW-2', price: '62만원' },
  { series: '명품 진공함', name: '도화홍학 · DH-5', price: '62만원' },
  { series: '명품 진공함', name: '도화청학 · DH-4', price: '62만원' },
  { series: '명품 진공함', name: '도화무지 · DH-1', price: '60만원' },
  { series: '명품 진공함', name: '도원천주교 · DW-5', price: '62만원' },
  { series: '명품 진공함', name: '도원불교 · DW-4', price: '62만원' },
  { series: '명품 진공함', name: '도원기독교 · DW-3', price: '62만원' },

  // 소망 진공함 (210×210) — 70만원
  { series: '소망 진공함', name: '소망블루 · SM-2', price: '70만원' },
  { series: '소망 진공함', name: '소망핑크 · SM-1', price: '70만원' },
  { series: '소망 진공함', name: '소망금크 · SM-4', price: '70만원' },
  { series: '소망 진공함', name: '소망금송학 · SM-3', price: '70만원' },
  { series: '소망 진공함', name: '소망천주교 · SM-7', price: '70만원' },
  { series: '소망 진공함', name: '소망불교 · SM-6', price: '70만원' },
  { series: '소망 진공함', name: '소망기독교 · SM-5', price: '70만원' },

  // 조각 밀봉진공함 (215×225) — 87만원
  { series: '조각 밀봉진공함', name: '태림조각일반 · TA-1', price: '87만원' },
  { series: '조각 밀봉진공함', name: '태림조각불교 · TA-3', price: '87만원' },
  { series: '조각 밀봉진공함', name: '태림조각천주교 · TA-2', price: '87만원' },
  { series: '조각 밀봉진공함', name: '태림조각천주교 · TA-4', price: '87만원' },

  // 이름보석 밀봉진공함 (220×225) — 90만원
  { series: '이름보석 밀봉진공함', name: '이름주얼난 · ARJ-2', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼송학 · ARJ-1', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼천황 · ARJ-5', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼명성 · ARJ-4', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼궁 · ARJ-3', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼선천황 · ARJ-8', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼선명성 · ARJ-7', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼선궁 · ARJ-6', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼천주교 · ARJ-11', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼불교 · ARJ-10', price: '90만원' },
  { series: '이름보석 밀봉진공함', name: '이름주얼기독교 · ARJ-9', price: '90만원' },

  // 이중 진공함 (210×210) — 85만원
  { series: '이중 진공함', name: '이중진주운학 · EH-6', price: '85만원' },
  { series: '이중 진공함', name: '이중칼라난 · EH-5', price: '85만원' },
  { series: '이중 진공함', name: '이중칼라송학 · EH-4', price: '85만원' },
  { series: '이중 진공함', name: '이중천주교 · EC-3', price: '85만원' },
  { series: '이중 진공함', name: '이중불교 · EB-2', price: '85만원' },
  { series: '이중 진공함', name: '이중기독교 · EG-1', price: '85만원' },

  // 이중 밀봉진공함 ABS — 75/108만원
  { series: '이중 밀봉진공함 (ABS)', name: '이중밀봉칼라송학 · EM-2', price: '75만원' },
  { series: '이중 밀봉진공함 (ABS)', name: '이중밀봉송학 · EM-1', price: '75만원' },
  { series: '이중 밀봉진공함 (ABS)', name: '이중밀봉블랙자개 · EMR-1', price: '108만원' },

  // 파보 (215×215) — 95만원
  { series: '파보', name: '봉분골드용궁 · BOB-3', price: '95만원' },
  { series: '파보', name: '봉분골드난 · BOB-2', price: '95만원' },
  { series: '파보', name: '봉분골드천황 · BOB-5', price: '95만원' },
  { series: '파보', name: '봉분골드송학 · BOB-1', price: '95만원' },
  { series: '파보', name: '봉분골드명성 · BOB-4', price: '95만원' },
  { series: '파보', name: '봉분골드그린궁 · BOB-10', price: '95만원' },
  { series: '파보', name: '봉분골드천주교 · BOB-8', price: '95만원' },
  { series: '파보', name: '봉분골드불교 · BOB-7', price: '95만원' },
  { series: '파보', name: '봉분골드기독교 · BOB-6', price: '95만원' },

  // 별자리 탄생석 밀봉진공함 — 115/120만원
  { series: '별자리 탄생석', name: '봉봉십이궁 · BOS-1', price: '120만원' },
  { series: '별자리 탄생석', name: '봉봉오하수 · BOG-1', price: '120만원' },
  { series: '별자리 탄생석', name: '아름선은하수 · ARG-2', price: '115만원' },
  { series: '별자리 탄생석', name: '아름선은하수 · ARG-1', price: '115만원' },
  { series: '별자리 탄생석', name: '아름십이궁 · ARS-2', price: '115만원' },
  { series: '별자리 탄생석', name: '아름십이궁 · ARS-1', price: '115만원' },

  // 진금형 삼중 밀봉진공함 (220×220) — 105/125만원
  { series: '진금형 삼중 밀봉진공함', name: '휴안명성 · HU-3', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '휴안천황 · HU-2', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '휴안궁 · HU-1', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '휴안사렐 · HUL-1', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '휴안십장생 · HU-10', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '안향궁 · AN-1', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '휴안청춘 · HUF-1', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '전국일반 · CG-1', price: '125만원' },
  { series: '진금형 삼중 밀봉진공함', name: '인향백자 · AN-3', price: '105만원' },

  // 잠금형 삼중 밀봉진공함 화이트/실크 (220×220) — 125만원
  { series: '잠금형 삼중 밀봉진공함', name: '휴안화이트천주교 · HUW-3', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안화이트불교 · HUW-2', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안화이트기독교 · HUW-1', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안실크천주교 · HUS-3', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안실크불교 · HUS-2', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안실크기독교 · HUS-1', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안천금천주교 · CGC-1', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안천금불교 · CGB-3', price: '125만원' },
  { series: '잠금형 삼중 밀봉진공함', name: '휴안천금기독교 · CGG-2', price: '125만원' },

  // 잠금형 명품자개함 (220×225) — 125만원
  { series: '잠금형 명품자개함', name: '아름화이트자개 · ARS-3', price: '125만원' },
  { series: '잠금형 명품자개함', name: '아름꽃자개 · ARF-2', price: '125만원' },
  { series: '잠금형 명품자개함', name: '아름골드자개 · ARG-1', price: '125만원' },

  // 진금형 삼중 밀봉진공함 주얼 (220×225) — 130/135만원
  { series: '주얼 밀봉진공함', name: '안향주얼금꽃 · ANG-2', price: '130만원' },
  { series: '주얼 밀봉진공함', name: '안향주얼엄금꽃 · ANG-1', price: '130만원' },
  { series: '주얼 밀봉진공함', name: '휴안주얼그린난 · HGS-2', price: '130만원' },
  { series: '주얼 밀봉진공함', name: '휴안주얼그린송학 · HGS-1', price: '130만원' },
  { series: '주얼 밀봉진공함', name: '휴안주얼오로라블루 · HUO-3', price: '135만원' },
  { series: '주얼 밀봉진공함', name: '휴안주얼오로라핑크 · HUO-2', price: '135만원' },
  { series: '주얼 밀봉진공함', name: '휴안주얼오로라실버 · HUO-1', price: '135만원' },

  // 잠금형 삼중 명품자개함 (220×220) — 150만원
  { series: '잠금형 삼중 명품자개함', name: '휴안골드자개 · HUG-16', price: '150만원' },
  { series: '잠금형 삼중 명품자개함', name: '휴안화이트자개 · HUG-14', price: '150만원' },

  // 황실황금함 (220×220) — 185만원
  { series: '황실황금함', name: '황실황금송학 · HSS-5', price: '185만원' },
  { series: '황실황금함', name: '황실황금천주교 · HSS-4', price: '185만원' },
  { series: '황실황금함', name: '황실황금불교 · HSS-3', price: '185만원' },
  { series: '황실황금함', name: '황실황금기독교 · HSS-2', price: '185만원' },

  // 황금함 (220×225) — 250만원
  { series: '황금함', name: '황금식창생 · WGS-1', price: '250만원' },
]

// 시리즈별 그룹핑
const URN_SERIES = [...new Set(URN_PRODUCTS.map(u => u.series))]

export default function ProductsPage() {
  return <Suspense><ProductsContent /></Suspense>
}

function ProductsContent() {
  const { user, loading, sessionReady } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showForm, setShowForm] = useState(!!searchParams.get('customer_id'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [showSold, setShowSold] = useState(false)
  const [toast, setToast] = useState('')

  const emptyForm = {
    customer_id: searchParams.get('customer_id') || '',
    product_type: '유골함',
    sangjo_company: '',
    amount: '',
    urn_name: '',
    consumer_price: '',
    funeral_date: '',
    engraving_tbd: 'true',
    engraving_birth: '',
    engraving_birth_type: '양력',
    engraving_death: '',
    engraving_death_type: '양력',
    relocation_date: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (sessionReady) loadAll()
  }, [sessionReady])

  useEffect(() => {
    if (user && !sessionReady) {
      const t = setTimeout(() => loadAll(), 1500)
      return () => clearTimeout(t)
    }
  }, [user])

  async function loadAll() {
    const [pRes, cRes] = await Promise.all([
      supabase.from('sales_products').select('*, customer:customers(id, name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name'),
    ])
    setProducts(pRes.data || [])
    setCustomers(cRes.data || [])
    setDataLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function handleUrnSelect(selectedName: string) {
    if (selectedName === '__custom__') {
      setForm(f => ({ ...f, urn_name: '', consumer_price: '' }))
      return
    }
    const found = URN_PRODUCTS.find(u => u.name === selectedName)
    setForm(f => ({
      ...f,
      urn_name: selectedName,
      consumer_price: found ? found.price : f.consumer_price,
    }))
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setShowForm(false)
    setForm({
      customer_id: p.customer_id,
      product_type: p.product_type,
      sangjo_company: p.sangjo_company || '',
      amount: p.amount ? String(p.amount) : '',
      urn_name: p.urn_name || '',
      consumer_price: p.consumer_price || '',
      funeral_date: p.funeral_date ? p.funeral_date.split('T')[0] : '',
      engraving_tbd: p.engraving_tbd === false ? 'false' : 'true',
      engraving_birth: p.engraving_birth || '',
      engraving_birth_type: p.engraving_birth_type || '양력',
      engraving_death: p.engraving_death || '',
      engraving_death_type: p.engraving_death_type || '양력',
      relocation_date: p.relocation_date ? p.relocation_date.split('T')[0] : '',
      notes: p.notes || '',
    })
  }

  const [expandedId, setExpandedId] = useState<string | null>(null)

  function cancelEdit() { setEditingId(null); setForm(emptyForm) }

  async function deleteProduct(id: string) {
    if (!confirm('이 판매 내역을 삭제하시겠습니까?')) return
    await supabase.from('sales_products').delete().eq('id', id)
    loadAll()
  }

  async function markAsSold(id: string) {
    await supabase.from('sales_products').update({ is_sold: true }).eq('id', id)
    loadAll()
    showToast('판매완료 처리되었습니다')
  }

  async function markAsActive(id: string) {
    await supabase.from('sales_products').update({ is_sold: false }).eq('id', id)
    loadAll()
    showToast('진행중으로 변경되었습니다')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const isTbd = form.engraving_tbd === 'true'
    const payload = {
      product_type: form.product_type,
      sangjo_company: form.sangjo_company || null,
      amount: form.amount ? parseInt(form.amount) : null,
      urn_name: form.product_type === '유골함' ? form.urn_name || null : null,
      consumer_price: form.product_type === '유골함' ? form.consumer_price || null : null,
      funeral_date: form.funeral_date || null,
      engraving_tbd: form.product_type === '유골함' ? isTbd : null,
      engraving_birth: form.product_type === '유골함' && !isTbd ? form.engraving_birth || null : null,
      engraving_birth_type: form.product_type === '유골함' && !isTbd ? form.engraving_birth_type : null,
      engraving_death: form.product_type === '유골함' && !isTbd ? form.engraving_death || null : null,
      engraving_death_type: form.product_type === '유골함' && !isTbd ? form.engraving_death_type : null,
      engraving_info: null, // deprecated
      relocation_date: form.relocation_date || null,
      notes: form.notes || null,
    }

    if (editingId) {
      await supabase.from('sales_products').update(payload).eq('id', editingId)
      setEditingId(null)
    } else {
      const { error } = await supabase.from('sales_products').insert({ ...payload, customer_id: form.customer_id })
      if (error) { alert('저장 중 오류가 발생했습니다.'); setSaving(false); return }
      if (form.funeral_date) {
        const cust = customers.find(c => c.id === form.customer_id)
        if (cust) {
          await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'funeral_occurred', customerName: cust.name, productType: form.product_type }) })
        }
      }
      setShowForm(false)
    }

    setForm(emptyForm)
    loadAll()
    setSaving(false)
    showToast('저장되었습니다')
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  const showingForm = showForm || !!editingId
  const isKnownUrn = URN_PRODUCTS.some(u => u.name === form.urn_name)

  const baseFiltered = products.filter(p => {
    if (productFilter !== 'all' && p.product_type !== productFilter) return false
    if (productSearch && !(p.customer?.name || '').includes(productSearch)) return false
    return true
  })
  const activeProducts = baseFiltered.filter(p => !p.is_sold)
  const soldProducts = baseFiltered.filter(p => p.is_sold)
  const filteredProducts = showSold ? soldProducts : activeProducts

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">상품 판매</h2>
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
        {showingForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-700">{editingId ? '상품 수정' : '상품 등록'}</h3>
              {editingId && <button type="button" onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">취소</button>}
            </div>

            <div className="p-4 space-y-3">
              {!editingId && (
                <div>
                  <label className={lbl}>고객 *</label>
                  <select required value={form.customer_id} onChange={e => set('customer_id', e.target.value)} className={cls}>
                    <option value="">고객 선택</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={lbl}>상품 유형</label>
                <div className="flex gap-2">
                  {(['유골함', '상조연계', '개장업'] as const).map(t => {
                    const conf = PRODUCT_CONFIG[t]
                    return (
                      <button key={t} type="button" onClick={() => set('product_type', t)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          form.product_type === t
                            ? `bg-gradient-to-br ${conf.gradient} text-white border-transparent shadow-sm`
                            : `${conf.lightBg} ${conf.textColor} border-transparent`
                        }`}>
                        {conf.icon} {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 유골함 정보 */}
              {form.product_type === '유골함' && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 space-y-3">
                  <p className="text-xs font-bold text-purple-700">⚱️ 유골함 정보</p>

                  {/* 유골함 선택 드롭다운 */}
                  <div>
                    <label className={lbl}>유골함 선택</label>
                    <select
                      value={isKnownUrn ? form.urn_name : (form.urn_name ? '__custom__' : '')}
                      onChange={e => handleUrnSelect(e.target.value)}
                      className={cls}
                    >
                      <option value="">-- 유골함 선택 --</option>
                      {URN_SERIES.map(series => (
                        <optgroup key={series} label={series}>
                          {URN_PRODUCTS.filter(u => u.series === series).map(u => (
                            <option key={u.name} value={u.name}>{u.name} ({u.price})</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="__custom__">✏️ 직접 입력</option>
                    </select>
                  </div>

                  {/* 직접 입력 시 유골함명 텍스트 필드 표시 */}
                  {(!isKnownUrn) && (
                    <div>
                      <label className={lbl}>유골함명 직접 입력</label>
                      <input
                        value={form.urn_name}
                        onChange={e => set('urn_name', e.target.value)}
                        className={cls}
                        placeholder="예: 봉분골드명성 · BOB-4"
                      />
                    </div>
                  )}

                  {/* 소비자가격 — 목록 선택 시 자동 입력, 직접입력 시 수동 */}
                  <div>
                    <label className={lbl}>
                      소비자가격
                      {isKnownUrn && <span className="ml-1.5 text-purple-500 font-normal">(자동 입력)</span>}
                    </label>
                    <input
                      value={form.consumer_price}
                      onChange={e => set('consumer_price', e.target.value)}
                      className={`${cls} ${isKnownUrn ? 'bg-purple-50 text-purple-700 font-semibold' : ''}`}
                      placeholder="예: 95만원"
                      readOnly={isKnownUrn}
                    />
                  </div>
                </div>
              )}

              {form.product_type === '상조연계' && (
                <div>
                  <label className={lbl}>상조 업체명</label>
                  <input value={form.sangjo_company} onChange={e => set('sangjo_company', e.target.value)} className={cls} placeholder="상조회사명" />
                </div>
              )}

              <div>
                <label className={lbl}>판매가격 (원)</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className={cls} placeholder="실제 판매 금액" />
              </div>

              {form.product_type === '유골함' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-indigo-700">✏️ 각인 정보</p>
                    <button
                      type="button"
                      onClick={() => set('engraving_tbd', form.engraving_tbd === 'true' ? 'false' : 'true')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${form.engraving_tbd === 'true' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-300'}`}
                    >
                      {form.engraving_tbd === 'true' ? '미정' : '입력'}
                    </button>
                  </div>

                  {form.engraving_tbd === 'false' && (
                    <>
                      {/* 생 */}
                      <div>
                        <label className={lbl}>생 (출생일)</label>
                        <div className="flex gap-2">
                          <input
                            value={form.engraving_birth}
                            onChange={e => set('engraving_birth', e.target.value)}
                            className={cls}
                            placeholder="예: 1991.11.01"
                          />
                          <div className="flex gap-1 shrink-0">
                            {['양력', '음력'].map(t => (
                              <button key={t} type="button" onClick={() => set('engraving_birth_type', t)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${form.engraving_birth_type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* 졸 */}
                      <div>
                        <label className={lbl}>졸 (사망일)</label>
                        <div className="flex gap-2">
                          <input
                            value={form.engraving_death}
                            onChange={e => set('engraving_death', e.target.value)}
                            className={cls}
                            placeholder="예: 2026.03.21"
                          />
                          <div className="flex gap-1 shrink-0">
                            {['양력', '음력'].map(t => (
                              <button key={t} type="button" onClick={() => set('engraving_death_type', t)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${form.engraving_death_type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {form.engraving_tbd === 'true' && (
                    <p className="text-xs text-indigo-400">장례 후 각인 정보를 입력해주세요</p>
                  )}
                </div>
              )}

              {form.product_type === '개장업' && (
                <div>
                  <label className={lbl}>개장일</label>
                  <input type="date" value={form.relocation_date} onChange={e => set('relocation_date', e.target.value)} className={cls} />
                </div>
              )}

              <div>
                <label className={lbl}>메모</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={cls + ' h-16 resize-none'} placeholder="메모" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
                {saving ? '저장 중...' : editingId ? '수정 저장' : '등록'}
              </button>
            </div>
          </form>
        )}

        {/* 검색 + 필터 */}
        {!showingForm && (
          <>
            {/* 진행중 / 판매완료 탭 */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setShowSold(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${!showSold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                진행중 {activeProducts.length > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${!showSold ? 'bg-white/20' : 'bg-slate-100'}`}>{activeProducts.length}</span>}
              </button>
              <button onClick={() => setShowSold(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${showSold ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                판매완료 {soldProducts.length > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${showSold ? 'bg-white/20' : 'bg-slate-100'}`}>{soldProducts.length}</span>}
              </button>
            </div>
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="고객명 검색" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" />
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {[{key:'all',label:'전체'},{key:'유골함',label:'⚱️ 유골함'},{key:'상조연계',label:'🤝 상조연계'},{key:'개장업',label:'🔄 개장업'}].map(f => (
                <button key={f.key} onClick={() => setProductFilter(f.key)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${productFilter === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 상품 목록 */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-sm font-medium text-slate-500 mt-1">판매 내역이 없습니다</p>
            {productSearch || productFilter !== 'all' ? (
              <p className="text-xs text-slate-400">검색 조건을 바꿔보세요</p>
            ) : (
              <button onClick={() => setShowForm(true)}
                className="mt-1 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition">
                + 첫 상품 등록
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(p => {
              const conf = PRODUCT_CONFIG[p.product_type] || { icon: '📦', gradient: 'from-slate-400 to-slate-500', lightBg: 'bg-slate-50', textColor: 'text-slate-600' }
              const isExpanded = expandedId === p.id
              const isSold = !!p.is_sold
              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isSold ? 'border-emerald-100 opacity-75' : 'border-slate-100'}`}>
                  <div className={`h-1 ${isSold ? 'bg-emerald-400' : `bg-gradient-to-r ${conf.gradient}`}`} />

                  {/* 헤더 — 클릭 시 확장 */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full px-4 py-3.5 text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 bg-gradient-to-br ${conf.gradient} rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                          {conf.icon}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.customer?.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conf.lightBg} ${conf.textColor}`}>
                            {p.product_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSold && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">완료</span>}
                        {p.amount && <p className="text-sm font-bold text-slate-900">{p.amount.toLocaleString()}원</p>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>

                    {/* 접힌 상태에서 요약 정보 */}
                    {!isExpanded && (
                      <div className="mt-1.5 flex gap-3 flex-wrap">
                        {p.urn_name && <span className="text-xs text-purple-600 font-medium">{p.urn_name}</span>}
                        {p.product_type === '유골함' && (
                          <span className={`text-xs font-medium ${p.engraving_tbd !== false ? 'text-rose-400' : 'text-indigo-500'}`}>
                            {p.engraving_tbd !== false ? '각인 미정' : `생 ${p.engraving_birth || '-'} / 졸 ${p.engraving_death || '-'}`}
                          </span>
                        )}
                        {p.notes && <span className="text-xs text-slate-400 truncate max-w-[180px]">📝 {p.notes}</span>}
                      </div>
                    )}
                  </button>

                  {/* 확장된 상세 내용 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2.5">
                      {p.urn_name && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <p className="text-xs font-semibold text-purple-800">{p.urn_name}</p>
                          {p.consumer_price && <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">소비자가 {p.consumer_price}</span>}
                        </div>
                      )}
                      {p.sangjo_company && <DetailRow label="상조 업체" value={p.sangjo_company} />}
                      {p.funeral_date && <DetailRow label="장례일" value={new Date(p.funeral_date).toLocaleDateString('ko-KR')} />}
                      {p.product_type === '유골함' && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-xs font-bold text-indigo-700 mb-2">✏️ 각인 정보</p>
                          {p.engraving_tbd === true || (!p.engraving_birth && !p.engraving_death) ? (
                            <p className="text-xs text-indigo-400 font-medium">미정 — 장례 후 입력 예정</p>
                          ) : (
                            <>
                              {p.engraving_birth && <DetailRow label={`생 (${p.engraving_birth_type || '양력'})`} value={p.engraving_birth} />}
                              {p.engraving_death && <DetailRow label={`졸 (${p.engraving_death_type || '양력'})`} value={p.engraving_death} />}
                            </>
                          )}
                        </div>
                      )}
                      {p.relocation_date && <DetailRow label="개장일" value={new Date(p.relocation_date).toLocaleDateString('ko-KR')} />}
                      {p.amount && <DetailRow label="판매가" value={`${p.amount.toLocaleString()}원`} />}
                      {p.notes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-slate-500 mb-1">📝 메모</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('ko-KR')}</p>
                      <div className="flex gap-2 pt-1">
                        {isSold ? (
                          <>
                            <button onClick={() => markAsActive(p.id)}
                              className="flex-1 text-xs font-bold border border-slate-300 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                              ↩ 진행중으로
                            </button>
                            <button onClick={() => deleteProduct(p.id)}
                              className="px-4 text-xs font-semibold border border-rose-200 text-rose-500 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">
                              삭제
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { startEdit(p); setExpandedId(null) }}
                              className="flex-1 text-xs font-semibold border border-indigo-200 text-indigo-600 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors">
                              수정
                            </button>
                            <button onClick={() => { if (confirm('판매완료 처리하시겠습니까?')) markAsSold(p.id) }}
                              className="flex-1 text-xs font-bold border border-emerald-300 text-emerald-700 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                              판매완료
                            </button>
                            <button onClick={() => deleteProduct(p.id)}
                              className="px-4 text-xs font-semibold border border-rose-200 text-rose-500 py-2.5 rounded-xl hover:bg-rose-50 transition-colors">
                              삭제
                            </button>
                          </>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  )
}
