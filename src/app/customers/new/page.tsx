'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const cls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition'
const lbl = 'text-xs font-semibold text-slate-500 block mb-1.5'

export default function NewCustomerPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    visit_schedule: '',
    customer_type: '장례중',
    has_relative: false,
    relative_name: '',
    relative_relation: '',
    relative_anchidan: '',
    contract_year: '',
    deceased_name: '',
    funeral_home: '',
    has_sangjo: false,
    sangjo_company: '',
    called_us: false,
    pre_sale_type: '',
    discount: '',
    special_request: '',
    notes: '',
  })

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  function set(key: string, val: any) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload: any = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      visit_schedule: form.visit_schedule || null,
      customer_type: form.customer_type,
      has_relative: form.has_relative,
      relative_name: form.has_relative ? form.relative_name || null : null,
      relative_relation: form.has_relative ? form.relative_relation || null : null,
      relative_anchidan: form.has_relative ? form.relative_anchidan || null : null,
      contract_year: form.has_relative ? form.contract_year || null : null,
      deceased_name: form.customer_type === '장례중' ? form.deceased_name || null : null,
      funeral_home: form.customer_type === '장례중' ? form.funeral_home || null : null,
      has_sangjo: ['장례중', '위중'].includes(form.customer_type) ? form.has_sangjo : null,
      sangjo_company: form.has_sangjo ? form.sangjo_company || null : null,
      called_us: form.customer_type === '장례중' ? form.called_us : null,
      pre_sale_type: form.customer_type === '사전분양' ? form.pre_sale_type || null : null,
      discount: form.discount || null,
      special_request: form.special_request || null,
      notes: form.notes || null,
      counselor_id: user?.id || null,
      status: '상담중',
      is_walking: false,
      is_risky: false,
    }

    const { data, error } = await supabase.from('customers').insert(payload).select().single()

    if (!error && data) {
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_customer', name: form.name, customerType: form.customer_type, isWalking: false }),
      })
      router.push(`/customers/${data.id}`)
    } else {
      alert('저장 중 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  if (loading || !user) return null

  const TYPE_OPTIONS = [
    { value: '장례중', label: '⚰️ 장례중', color: 'bg-purple-50 border-purple-200 text-purple-700', activeColor: 'bg-purple-600 border-purple-600 text-white' },
    { value: '위중', label: '🕯️ 위중', color: 'bg-rose-50 border-rose-200 text-rose-700', activeColor: 'bg-rose-500 border-rose-500 text-white' },
    { value: '사전분양', label: '🏛️ 사전분양', color: 'bg-teal-50 border-teal-200 text-teal-700', activeColor: 'bg-teal-600 border-teal-600 text-white' },
    { value: '개장이장', label: '🔄 개장이장', color: 'bg-orange-50 border-orange-200 text-orange-700', activeColor: 'bg-orange-500 border-orange-500 text-white' },
  ]

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2 className="text-xl font-bold text-slate-900">고객 등록</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* 기본 정보 */}
          <Card title="기본 정보" emoji="👤">
            <Field label="고객명 *">
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={cls} placeholder="이름 입력" />
            </Field>
            <Field label="연락처">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={cls} placeholder="010-0000-0000" />
            </Field>
            <Field label="거주지">
              <input value={form.address} onChange={e => set('address', e.target.value)} className={cls} placeholder="주소 입력" />
            </Field>
            <Field label="답사 일정">
              <input type="date" value={form.visit_schedule} onChange={e => set('visit_schedule', e.target.value)} className={cls} />
            </Field>
            <CheckField label="연고자 있음" checked={form.has_relative} onChange={v => set('has_relative', v)} />
          </Card>

          {/* 연고자 */}
          {form.has_relative && (
            <Card title="연고자 확인사항" emoji="👨‍👩‍👧">
              <Field label="연고자명">
                <input value={form.relative_name} onChange={e => set('relative_name', e.target.value)} className={cls} placeholder="연고자 이름" />
              </Field>
              <Field label="관계">
                <input value={form.relative_relation} onChange={e => set('relative_relation', e.target.value)} className={cls} placeholder="예: 배우자, 자녀 등" />
              </Field>
              <Field label="안치단">
                <input value={form.relative_anchidan} onChange={e => set('relative_anchidan', e.target.value)} className={cls} placeholder="안치단 정보" />
              </Field>
              <Field label="계약년도">
                <input type="month" value={form.contract_year} onChange={e => set('contract_year', e.target.value)} className={cls} />
              </Field>
            </Card>
          )}

          {/* 방문 유형 */}
          <Card title="방문 유형" emoji="🚪">
            <Field label="고객 유형 *">
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('customer_type', opt.value)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      form.customer_type === opt.value ? opt.activeColor : opt.color
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            {form.customer_type === '사전분양' && (
              <Field label="분양 대상">
                <select value={form.pre_sale_type} onChange={e => set('pre_sale_type', e.target.value)} className={cls}>
                  <option value="">선택</option>
                  <option value="본인">본인</option>
                  <option value="가족">가족</option>
                  <option value="제3자">제3자</option>
                </select>
              </Field>
            )}
          </Card>

          {/* 장례중 확인사항 */}
          {form.customer_type === '장례중' && (
            <Card title="장례중 확인사항" emoji="⚰️">
              <Field label="고인명">
                <input value={form.deceased_name} onChange={e => set('deceased_name', e.target.value)} className={cls} placeholder="고인 이름" />
              </Field>
              <Field label="장례식장">
                <input value={form.funeral_home} onChange={e => set('funeral_home', e.target.value)} className={cls} placeholder="장례식장명 또는 자택보관" />
              </Field>
              <CheckField label="전화 상담 여부" checked={form.called_us} onChange={v => set('called_us', v)} />
              <CheckField label="상조 가입 여부" checked={form.has_sangjo} onChange={v => set('has_sangjo', v)} />
              {form.has_sangjo && (
                <Field label="상조 업체명">
                  <input value={form.sangjo_company} onChange={e => set('sangjo_company', e.target.value)} className={cls} placeholder="상조회사명" />
                </Field>
              )}
            </Card>
          )}

          {/* 위중 확인사항 */}
          {form.customer_type === '위중' && (
            <Card title="위중 확인사항" emoji="🕯️">
              <CheckField label="상조 가입 여부" checked={form.has_sangjo} onChange={v => set('has_sangjo', v)} />
              {form.has_sangjo && (
                <Field label="상조 업체명">
                  <input value={form.sangjo_company} onChange={e => set('sangjo_company', e.target.value)} className={cls} placeholder="상조회사명" />
                </Field>
              )}
            </Card>
          )}

          {/* 추가 정보 */}
          <Card title="추가 정보" emoji="📋">
            <Field label="할인">
              <input value={form.discount} onChange={e => set('discount', e.target.value)} className={cls} placeholder="할인 내용" />
            </Field>
            <Field label="안치단 요청">
              <input value={form.special_request} onChange={e => set('special_request', e.target.value)} className={cls} placeholder="요청사항" />
            </Field>
            <Field label="메모">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={cls + ' h-20 resize-none'} placeholder="특이사항 입력" />
            </Field>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-sm shadow-indigo-200 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '고객 등록'}
          </button>
        </form>
      </main>
    </div>
  )
}

function Card({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-0.5">
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}
        onClick={() => onChange(!checked)}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}
