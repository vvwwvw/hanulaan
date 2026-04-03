const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!

export async function sendTelegram(message: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

export function notifyNewCustomer(name: string, type: string, isWalking: boolean) {
  const tag = isWalking ? '🚶 워킹' : '📋 답사자'
  return sendTelegram(
    `🔔 <b>새 방문 고객</b>\n고객명: ${name}\n유형: ${type}\n구분: ${tag}`
  )
}

export function notifyWalkingAssigned(customerName: string, salesName: string) {
  return sendTelegram(
    `✅ <b>워킹 배정 완료</b>\n고객명: ${customerName}\n담당 영업자: ${salesName}`
  )
}

export function notifyContractExpiringSoon(customerName: string, daysLeft: number, expiryDate: string) {
  return sendTelegram(
    `⚠️ <b>가계약 만료 임박</b>\n고객명: ${customerName}\n만료일: ${expiryDate}\n남은 기간: ${daysLeft}일`
  )
}

export function notifyFuneralOccurred(customerName: string, productType: string) {
  return sendTelegram(
    `🕯 <b>장례 발생</b>\n고객명: ${customerName}\n상품: ${productType}\n각인 정보 등록 필요`
  )
}

export function notifyNewContract(customerName: string, lotNumber: string, amount: string) {
  return sendTelegram(
    `🎉 <b>계약 완료</b>\n고객명: ${customerName}\n호수: ${lotNumber}\n금액: ${amount}`
  )
}
