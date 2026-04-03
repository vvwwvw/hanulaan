'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const cls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition'
const lbl = 'text-xs font-semibold text-slate-500 block mb-1.5'

function formatPhone(v: string) {
  const n = v.replace(/[^0-9]/g, '')
  if (n.length <= 3) return n
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}`
}

const STATUS_STYLES: Record<string, string> = {
  '상담중': 'bg-blue-50 text-blue-600 border border-blue-100',
  '가계약': 'bg-amber-50 text-amber-700 border border-amber-200',
  '계약완료': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '취소': 'bg-slate-100 text-slate-500 border border-slate-200',
}

const TYPE_CONFIG: Record<string, { icon: string; gradient: string }> = {
  '장례중': { icon: '⚰️', gradient: 'from-purple-500 to-purple-600' },
  '위중': { icon: '🕯️', gradient: 'from-rose-400 to-rose-500' },
  '사전분양': { icon: '🏛️', gradient: 'from-teal-500 to-teal-600' },
  '개장이장': { icon: '🔄', gradient: 'from-orange-400 to-orange-500' },
}

export default function CustomerDetailPage() {
  const { user, loading, sessionReady } = useAuth()
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [customer, setCustomer] = useState<any>(null)
  const [contracts, setContracts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  useEffect(() => {
    if (sessionReady) loadAll()
  }, [sessionReady])

  async function loadAll() {
    const id = params.id as string
    const [cRes, contractRes, productRes, commentRes] = await Promise.all([
      supabase.from('customers').select('*, counselor:users!counselor_id(name)').eq('id', id).single(),
      supabase.from('contracts').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('sales_products').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('comments').select('*, user:users!user_id(name, role)').eq('customer_id', id).order('created_at', { ascending: true }),
    ])
    setCustomer(cRes.data)
    setContracts(contractRes.data || [])
    setProducts(productRes.data || [])
    setComments(commentRes.data || [])
    setDataLoading(false)
  }

  function startEdit() {
    setEditForm({
      ...customer,
      visit_schedule: customer.visit_schedule ? customer.visit_schedule.split('T')[0] : '',
      funeral_tbd: customer.customer_type === '위중' ? (customer.funeral_home === '미정' || !customer.funeral_home) : false,
      funeral_home: customer.customer_type === '위중' && customer.funeral_home !== '미정' ? customer.funeral_home || '' : '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    await supabase.from('customers').update({
      name: editForm.name,
      phone: editForm.phone || null,
      address: editForm.address || null,
      visit_schedule: editForm.visit_schedule || null,
      customer_type: editForm.customer_type,
      pre_sale_type: editForm.pre_sale_type || null,
      has_relative: editForm.has_relative,
      relative_name: editForm.has_relative ? editForm.relative_name || null : null,
      relative_relation: editForm.has_relative ? editForm.relative_relation || null : null,
      relative_anchidan: editForm.has_relative ? editForm.relative_anchidan || null : null,
      contract_year: editForm.has_relative ? editForm.contract_year || null : null,
      deceased_name: editForm.customer_type === '장례중' ? editForm.deceased_name || null : null,
      funeral_home: editForm.customer_type === '장례중' ? editForm.funeral_home || null : null,
      called_us: editForm.customer_type === '장례중' ? editForm.called_us : null,
      has_sangjo: ['장례중', '위중'].includes(editForm.customer_type) ? editForm.has_sangjo : null,
      sangjo_company: editForm.has_sangjo ? editForm.sangjo_company || null : null,
      discount: editForm.discount || null,
      special_request: editForm.special_request || null,
      notes: editForm.notes || null,
    }).eq('id', customer.id)
    setSaving(false)
    setEditing(false)
    loadAll()
  }

  async function updateStatus(status: string) {
    await supabase.from('customers').update({ status }).eq('id', customer.id)
    loadAll()
  }

  async function deleteCustomer() {
    if (!confirm(`"${customer.name}" 고객을 삭제하시겠습니까?\n모든 관련 데이터가 삭제됩니다.`)) return
    await supabase.from('comments').delete().eq('customer_id', customer.id)
    await supabase.from('contracts').delete().eq('customer_id', customer.id)
    await supabase.from('sales_products').delete().eq('customer_id', customer.id)
    await supabase.from('customers').delete().eq('id', customer.id)
    router.replace('/customers')
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    await supabase.from('comments').insert({ customer_id: customer.id, user_id: user?.id, content: newComment.trim() })
    setNewComment('')
    setPostingComment(false)
    loadAll()
  }

  async function deleteComment(id: string) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await supabase.from('comments').delete().eq('id', id)
    loadAll()
  }

  if (loading || !user || dataLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
  if (!customer) return <div className="p-8 text-center text-slate-400">고객을 찾을 수 없습니다.</div>

  const typeConf = TYPE_CONFIG[customer.customer_type] || { icon: '👤', gradient: 'from-slate-400 to-slate-500' }

  return (
    <div className="pb-20">
      <Navbar />
      <main className="px-4 py-5 max-w-lg mx-auto">

        {/* 헤더 네비 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex gap-2">
            {!editing && (
              <button onClick={startEdit} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition">
                수정
              </button>
            )}
            <button onClick={deleteCustomer} className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition">
              삭제
            </button>
          </div>
        </div>

        {/* ── 수정 모드 ── */}
        {editing ? (
          <div className="space-y-3">
            <EditCard title="기본 정보" emoji="👤">
              <Field label="고객명 *"><input value={editForm.name || ''} onChange={e => setEditForm((f:any) => ({...f, name: e.target.value}))} className={cls} /></Field>
              <Field label="연락처"><input value={editForm.phone || ''} onChange={e => setEditForm((f:any) => ({...f, phone: formatPhone(e.target.value)}))} className={cls} placeholder="010-0000-0000" inputMode="numeric" /></Field>
              <Field label="거주지"><input value={editForm.address || ''} onChange={e => setEditForm((f:any) => ({...f, address: e.target.value}))} className={cls} /></Field>
              <Field label="답사 일정"><input type="date" value={editForm.visit_schedule || ''} onChange={e => setEditForm((f:any) => ({...f, visit_schedule: e.target.value}))} className={cls} /></Field>
              <CheckField label="연고자 있음" checked={!!editForm.has_relative} onChange={v => setEditForm((f:any) => ({...f, has_relative: v}))} />
            </EditCard>

            {editForm.has_relative && (
              <EditCard title="연고자 확인사항" emoji="👨‍👩‍👧">
                <Field label="연고자명"><input value={editForm.relative_name || ''} onChange={e => setEditForm((f:any) => ({...f, relative_name: e.target.value}))} className={cls} /></Field>
                <Field label="관계"><input value={editForm.relative_relation || ''} onChange={e => setEditForm((f:any) => ({...f, relative_relation: e.target.value}))} className={cls} /></Field>
                <Field label="안치단"><input value={editForm.relative_anchidan || ''} onChange={e => setEditForm((f:any) => ({...f, relative_anchidan: e.target.value}))} className={cls} /></Field>
                <Field label="계약년도"><input type="month" value={editForm.contract_year || ''} onChange={e => setEditForm((f:any) => ({...f, contract_year: e.target.value}))} className={cls} /></Field>
              </EditCard>
            )}

            <EditCard title="방문 유형" emoji="🚪">
              <Field label="고객 유형">
                <select value={editForm.customer_type || ''} onChange={e => setEditForm((f:any) => ({...f, customer_type: e.target.value}))} className={cls}>
                  <option value="장례중">⚰️ 장례중</option>
                  <option value="위중">🕯️ 위중</option>
                  <option value="사전분양">🏛️ 사전분양</option>
                  <option value="개장이장">🔄 개장이장</option>
                </select>
              </Field>
              {editForm.customer_type === '사전분양' && (
                <Field label="분양 대상">
                  <select value={editForm.pre_sale_type || ''} onChange={e => setEditForm((f:any) => ({...f, pre_sale_type: e.target.value}))} className={cls}>
                    <option value="">선택</option>
                    <option value="본인">본인</option>
                    <option value="가족">가족</option>
                    <option value="제3자">제3자</option>
                  </select>
                </Field>
              )}
            </EditCard>

            {editForm.customer_type === '장례중' && (
              <EditCard title="장례중 확인사항" emoji="⚰️">
                <Field label="고인명"><input value={editForm.deceased_name || ''} onChange={e => setEditForm((f:any) => ({...f, deceased_name: e.target.value}))} className={cls} /></Field>
                <Field label="장례식장"><input value={editForm.funeral_home || ''} onChange={e => setEditForm((f:any) => ({...f, funeral_home: e.target.value}))} className={cls} /></Field>
                <CheckField label="전화 상담 여부" checked={!!editForm.called_us} onChange={v => setEditForm((f:any) => ({...f, called_us: v}))} />
                <CheckField label="상조 가입 여부" checked={!!editForm.has_sangjo} onChange={v => setEditForm((f:any) => ({...f, has_sangjo: v}))} />
                {editForm.has_sangjo && <Field label="상조 업체명"><input value={editForm.sangjo_company || ''} onChange={e => setEditForm((f:any) => ({...f, sangjo_company: e.target.value}))} className={cls} /></Field>}
              </EditCard>
            )}

            {editForm.customer_type === '위중' && (
              <EditCard title="위중 확인사항" emoji="🕯️">
                <Field label="장례 예정일">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm((f:any) => ({...f, funeral_tbd: !f.funeral_tbd, funeral_home: !f.funeral_tbd ? '' : f.funeral_home}))}
                      className={`shrink-0 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${editForm.funeral_tbd ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      미정
                    </button>
                    {!editForm.funeral_tbd ? (
                      <input type="date" value={editForm.funeral_home || ''} onChange={e => setEditForm((f:any) => ({...f, funeral_home: e.target.value}))} className={cls} />
                    ) : (
                      <div className={cls + ' text-slate-400 flex items-center'}>장례 일정 미정</div>
                    )}
                  </div>
                </Field>
                <CheckField label="상조 가입 여부" checked={!!editForm.has_sangjo} onChange={v => setEditForm((f:any) => ({...f, has_sangjo: v}))} />
                {editForm.has_sangjo && <Field label="상조 업체명"><input value={editForm.sangjo_company || ''} onChange={e => setEditForm((f:any) => ({...f, sangjo_company: e.target.value}))} className={cls} /></Field>}
              </EditCard>
            )}

            <EditCard title="추가 정보" emoji="📋">
              <Field label="할인"><input value={editForm.discount || ''} onChange={e => setEditForm((f:any) => ({...f, discount: e.target.value}))} className={cls} /></Field>
              <Field label="안치단 요청"><input value={editForm.special_request || ''} onChange={e => setEditForm((f:any) => ({...f, special_request: e.target.value}))} className={cls} /></Field>
              <Field label="메모"><textarea value={editForm.notes || ''} onChange={e => setEditForm((f:any) => ({...f, notes: e.target.value}))} className={cls + ' h-20 resize-none'} /></Field>
            </EditCard>

            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 py-3.5 rounded-2xl text-sm font-semibold transition-colors">
                취소
              </button>
            </div>
          </div>

        ) : (
          /* ── 보기 모드 ── */
          <>
            {/* 프로필 카드 */}
            <div className={`bg-gradient-to-br ${typeConf.gradient} rounded-2xl p-5 mb-3 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{typeConf.icon}</span>
                    <span className="text-white/70 text-sm">{customer.customer_type}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{customer.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{customer.phone || '연락처 없음'}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[customer.status] || 'bg-white/20 text-white'}`}>
                  {customer.status}
                </span>
              </div>
              {customer.address && (
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-1.5">
                  <span className="text-white/60 text-xs">📍</span>
                  <span className="text-white/80 text-xs">{customer.address}</span>
                </div>
              )}
            </div>

            {/* 기본 정보 */}
            <InfoCard title="기본 정보" emoji="📌">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="고객 유형" value={`${typeConf.icon} ${customer.customer_type}`} />
                {customer.pre_sale_type && <InfoItem label="분양 대상" value={customer.pre_sale_type} />}
                {customer.visit_schedule && <InfoItem label="답사 일정" value={new Date(customer.visit_schedule).toLocaleDateString('ko-KR')} />}
                {customer.counselor && <InfoItem label="상담자" value={customer.counselor.name} />}
              </div>
              {customer.notes && (
                <div className="mt-3 bg-slate-50 rounded-xl p-3 text-sm text-slate-600 border border-slate-100">
                  {customer.notes}
                </div>
              )}
            </InfoCard>

            {/* 연고자 */}
            {customer.has_relative && (
              <InfoCard title="연고자 정보" emoji="👨‍👩‍👧">
                <div className="grid grid-cols-2 gap-3">
                  {customer.relative_name && <InfoItem label="연고자명" value={customer.relative_name} />}
                  {customer.relative_relation && <InfoItem label="관계" value={customer.relative_relation} />}
                  {customer.relative_anchidan && <InfoItem label="안치단" value={customer.relative_anchidan} />}
                  {customer.contract_year && <InfoItem label="계약년도" value={customer.contract_year} />}
                </div>
              </InfoCard>
            )}

            {/* 장례중 */}
            {customer.customer_type === '장례중' && (
              <InfoCard title="장례중 확인사항" emoji="⚰️">
                <div className="grid grid-cols-2 gap-3">
                  {customer.deceased_name && <InfoItem label="고인명" value={customer.deceased_name} />}
                  {customer.funeral_home && <InfoItem label="장례식장" value={customer.funeral_home} />}
                  {customer.called_us !== null && <InfoItem label="전화 상담" value={customer.called_us ? '✅ 예' : '❌ 아니오'} />}
                  {customer.has_sangjo !== null && <InfoItem label="상조" value={customer.has_sangjo ? '있음' : '없음'} />}
                  {customer.sangjo_company && <InfoItem label="상조 업체" value={customer.sangjo_company} />}
                </div>
              </InfoCard>
            )}

            {/* 위중 */}
            {customer.customer_type === '위중' && (
              <InfoCard title="위중 확인사항" emoji="🕯️">
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="장례 예정일" value={customer.funeral_home || '미정'} />
                  {customer.has_sangjo !== null && <InfoItem label="상조" value={customer.has_sangjo ? '있음' : '없음'} />}
                  {customer.sangjo_company && <InfoItem label="상조 업체" value={customer.sangjo_company} />}
                </div>
              </InfoCard>
            )}

            {/* 추가 정보 */}
            {(customer.discount || customer.special_request) && (
              <InfoCard title="추가 정보" emoji="📋">
                <div className="grid grid-cols-2 gap-3">
                  {customer.discount && <InfoItem label="할인" value={customer.discount} />}
                  {customer.special_request && <InfoItem label="안치단 요청" value={customer.special_request} />}
                </div>
              </InfoCard>
            )}

            {/* 상태 변경 */}
            <InfoCard title="상태 변경" emoji="🔄">
              <div className="flex gap-2 flex-wrap">
                {(['상담중', '가계약', '계약완료', '취소'] as const).map(s => (
                  <button key={s} onClick={() => updateStatus(s)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      customer.status === s
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </InfoCard>

            {/* 계약 현황 */}
            <InfoCard title="계약 현황" emoji="📝" action={
              <Link href={`/contracts?customer_id=${customer.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">+ 등록</Link>
            }>
              {contracts.length === 0 ? (
                <EmptyState text="계약 내역이 없습니다" />
              ) : (
                <div className="space-y-2">
                  {contracts.map(c => (
                    <ContractItem key={c.id} contract={c} onSave={loadAll} supabase={supabase} />
                  ))}
                </div>
              )}
            </InfoCard>

            {/* 상품 판매 */}
            <InfoCard title="상품 판매" emoji="📦" action={
              <Link href={`/products?customer_id=${customer.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">+ 등록</Link>
            }>
              {products.length === 0 ? (
                <EmptyState text="판매 내역이 없습니다" />
              ) : (
                <div className="space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">{p.product_type}</span>
                        {p.amount && <span className="text-sm font-bold text-indigo-600">{p.amount.toLocaleString()}원</span>}
                      </div>
                      {p.funeral_date && <p className="text-xs text-slate-500 mt-1">장례일: {new Date(p.funeral_date).toLocaleDateString('ko-KR')}</p>}
                      {p.engraving_info && <p className="text-xs text-purple-600 mt-0.5">각인: {p.engraving_info}</p>}
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>

            {/* 댓글 */}
            <InfoCard title="메모 / 의견" emoji="💬">
              <div className="space-y-2.5 mb-3">
                {comments.length === 0 && <EmptyState text="아직 작성된 의견이 없습니다" />}
                {comments.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{c.user?.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{c.user?.role === 'admin' ? '관리자' : '상담자'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(user?.id === c.user_id || user?.role === 'admin') && (
                          <button onClick={() => deleteComment(c.id)} className="text-[11px] text-rose-400 hover:text-rose-600">삭제</button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white resize-none h-16 transition"
                  placeholder="의견을 입력하세요..."
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postComment() }}
                />
                <button onClick={postComment} disabled={postingComment || !newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl text-xs font-bold disabled:opacity-40 transition-colors">
                  등록
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Ctrl+Enter로 빠르게 등록</p>
            </InfoCard>
          </>
        )}
      </main>
    </div>
  )
}

function ContractItem({ contract: c, onSave, supabase }: { contract: any; onSave: () => void; supabase: any }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contract_type: c.contract_type,
    provisional_date: c.provisional_date || '',
    expiry_date: c.expiry_date || '',
    lot_number: c.lot_number || '',
    total_amount: c.total_amount ? String(c.total_amount) : '',
    paid_amount: c.paid_amount ? String(c.paid_amount) : '',
    notes: c.notes || '',
  })

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    setSaving(true)
    await supabase.from('contracts').update({
      contract_type: form.contract_type,
      provisional_date: form.provisional_date || null,
      expiry_date: form.contract_type === '가계약' ? form.expiry_date || null : null,
      lot_number: form.lot_number || null,
      total_amount: form.total_amount ? parseInt(form.total_amount) : null,
      paid_amount: form.paid_amount ? parseInt(form.paid_amount) : 0,
      notes: form.notes || null,
      is_completed: form.contract_type === '본계약',
    }).eq('id', c.id)
    setSaving(false)
    setEditing(false)
    onSave()
  }

  const cls2 = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition'

  if (editing) {
    return (
      <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/50 space-y-2">
        <div className="flex gap-2">
          {['가계약', '본계약'].map(t => (
            <button key={t} type="button" onClick={() => set('contract_type', t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${form.contract_type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-slate-500 font-semibold block mb-1">계약일</label><input type="date" value={form.provisional_date} onChange={e => {
            const d = e.target.value
            set('provisional_date', d)
            if (form.contract_type === '가계약' && d) set('expiry_date', new Date(new Date(d).getTime() + 14 * 86400000).toISOString().split('T')[0])
          }} className={cls2} /></div>
          {form.contract_type === '가계약' && <div><label className="text-xs text-slate-500 font-semibold block mb-1">만료일 (자동 +2주)</label><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={cls2} /></div>}
        </div>
        <input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} className={cls2} placeholder="호수" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} className={cls2} placeholder="분양금액" />
          <input type="number" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} className={cls2} placeholder="계약금" />
        </div>
        <input value={form.notes} onChange={e => set('notes', e.target.value)} className={cls2} placeholder="메모" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50">{saving ? '저장중...' : '저장'}</button>
          <button onClick={() => setEditing(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold">취소</button>
        </div>
      </div>
    )
  }

  const paidPct = c.total_amount ? Math.min(100, Math.round(((c.paid_amount || 0) / c.total_amount) * 100)) : 0

  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.contract_type === '본계약' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {c.contract_type}
          </span>
          <span className="text-sm font-bold text-slate-800 ml-2">{c.lot_number || '호수 미정'}</span>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 font-semibold hover:text-indigo-700">수정</button>
      </div>
      {c.total_amount && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>계약금 {(c.paid_amount || 0).toLocaleString()}원</span>
            <span>{c.total_amount.toLocaleString()}원 ({paidPct}%)</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      )}
      {c.expiry_date && <p className="text-xs text-slate-500">만료: {c.expiry_date}</p>}
      {c.notes && <p className="text-xs text-slate-500 mt-0.5">{c.notes}</p>}
      {c.history && (
        <div className="mt-2 bg-white rounded-lg p-2 text-xs text-slate-400 border border-slate-100">
          📋 {c.history}
        </div>
      )}
    </div>
  )
}

function InfoCard({ title, emoji, children, action }: { title: string; emoji: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span>{emoji}</span>
          <span className="text-sm font-bold text-slate-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EditCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
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
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}
        onClick={() => onChange(!checked)}
      >
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

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 text-center py-2">{text}</p>
}
