import { createClient } from '@supabase/supabase-js'
import { notifyContractExpiringSoon } from '@/lib/telegram'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 오늘 날짜 (로컬 기준 YYYY-MM-DD)
  const now = new Date()
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

  // D-3, D-1 날짜 계산
  function addDays(dateStr: string, n: number) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d + n)
    return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-')
  }

  const d1 = addDays(today, 1)
  const d3 = addDays(today, 3)

  // 만료일이 D-1 또는 D-3인 가계약 조회
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*, customer:customers(name)')
    .eq('contract_type', '가계약')
    .in('expiry_date', [d1, d3])

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  const sent: string[] = []

  for (const c of contracts || []) {
    const [ey, em, ed] = (c.expiry_date as string).split('-').map(Number)
    const expiry = new Date(ey, em - 1, ed)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysLeft = Math.ceil((expiry.getTime() - todayDate.getTime()) / 86400000)

    const customerName = c.customer?.name || '(이름없음)'
    await notifyContractExpiringSoon(customerName, daysLeft, c.expiry_date)
    sent.push(`${customerName} D-${daysLeft}`)
  }

  return Response.json({ ok: true, sent, today })
}
